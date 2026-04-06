import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';
import { toast } from 'sonner';

// Advanced notification system with real-time updates
const NotificationSystem = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);

  // System notification types
  const notificationTypes = {
    success: { icon: CheckCircle2, color: 'bg-green-500', textColor: 'text-green-50' },
    error: { icon: AlertCircle, color: 'bg-red-500', textColor: 'text-red-50' },
    warning: { icon: AlertCircle, color: 'bg-amber-500', textColor: 'text-amber-50' },
    info: { icon: Info, color: 'bg-blue-500', textColor: 'text-blue-50' },
  };

  // Add notification
  const addNotification = useCallback((type, title, message, duration = 5000) => {
    const id = Date.now();
    const notification = { id, type, title, message };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }
  }, []);

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Listen for custom notification events
  useEffect(() => {
    const handleCustomNotification = (event) => {
      const { type, title, message, duration } = event.detail;
      addNotification(type, title, message, duration);
    };

    window.addEventListener('showNotification', handleCustomNotification);
    return () => {
      window.removeEventListener('showNotification', handleCustomNotification);
    };
  }, [addNotification]);

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-sm space-y-2">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          const config = notificationTypes[notification.type] || notificationTypes.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className={`${config.color} ${config.textColor} rounded-xl shadow-2xl p-4 min-w-[320px]`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                  <p className="text-sm opacity-90">{notification.message}</p>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// Helper function to trigger notifications from anywhere
export const showNotification = (type, title, message, duration = 5000) => {
  const event = new CustomEvent('showNotification', {
    detail: { type, title, message, duration }
  });
  window.dispatchEvent(event);
  
  // Also use sonner for toast notifications
  toast[type]?.(message, { description: title });
};

export default NotificationSystem;