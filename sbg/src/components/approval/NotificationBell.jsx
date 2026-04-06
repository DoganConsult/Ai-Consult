import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, X, Clock, AlertCircle, CheckCircle, XCircle, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const typeConfig = {
  pending_approval: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  approved: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  escalated: { icon: ArrowUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  reminder: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
  assigned: { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50' },
  info: { icon: Bell, color: 'text-slate-500', bg: 'bg-slate-50' },
};

function NotificationItem({ notification, onMarkRead }) {
  const config = typeConfig[notification.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
      onClick={() => {
        if (!notification.is_read) onMarkRead(notification.id);
        if (notification.action_url) window.location.href = notification.action_url;
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-slate-900 ${!notification.is_read ? 'font-semibold' : ''}`}>
            {notification.title}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-slate-400 mt-1">
            {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true, locale: ar })}
          </p>
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
        )}
      </div>
    </motion.div>
  );
}

export default function NotificationBell({ userEmail }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => base44.entities.Notification.filter({ user_email: userEmail }, '-created_date', 50),
    enabled: !!userEmail,
    refetchInterval: 30000, // كل 30 ثانية
    retry: false
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      for (const n of unread) {
        await base44.entities.Notification.update(n.id, { is_read: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] })
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">الإشعارات</h3>
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-xs"
                  >
                    <CheckCheck className="w-3 h-3 ml-1" />
                    قراءة الكل
                  </Button>
                )}
              </div>

              <ScrollArea className="max-h-96">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">لا توجد إشعارات</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={(id) => markReadMutation.mutate(id)}
                    />
                  ))
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}