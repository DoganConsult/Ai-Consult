import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, X, Check, AlertTriangle, Info, AlertCircle, 
  ShoppingCart, Shield, Calculator, Users, Bot, HeadphonesIcon,
  ExternalLink, Trash2, CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const AGENT_ICONS = {
  procurement: ShoppingCart,
  grc: Shield,
  financial: Calculator,
  hr: Users,
  robotics: Bot,
  service_desk: HeadphonesIcon,
};

const SEVERITY_CONFIG = {
  info: { icon: Info, color: 'bg-blue-100 text-blue-600 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  warning: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-600 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  critical: { icon: AlertCircle, color: 'bg-red-100 text-red-600 border-red-200', badge: 'bg-red-100 text-red-700' },
};

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['agent-notifications'],
    queryFn: () => base44.entities.AgentNotification.filter({ is_read: false }, '-created_date', 50),
    refetchInterval: 30000 // Poll every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentNotification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-notifications'] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(notifications.map(n => 
        base44.entities.AgentNotification.update(n.id, { is_read: true })
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-notifications'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgentNotification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-notifications'] })
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => n.severity === 'critical' && !n.is_read).length;

  return (
    <>
      {/* Notification Bell Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${
              criticalCount > 0 ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          >
            {unreadCount}
          </motion.span>
        )}
      </Button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 h-full w-96 max-w-full bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">Notifications</h2>
                  <p className="text-xs text-slate-500">{unreadCount} unread</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => markAllReadMutation.mutate()}
                    >
                      <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Notifications List */}
              <ScrollArea className="flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {notifications.map((notif) => {
                      const AgentIcon = AGENT_ICONS[notif.agent_type] || Bot;
                      const severity = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
                      const SeverityIcon = severity.icon;

                      return (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          className={`p-3 rounded-lg border ${notif.is_read ? 'bg-white' : 'bg-slate-50'} ${severity.color.split(' ')[2]}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${severity.color.split(' ').slice(0, 2).join(' ')}`}>
                              <SeverityIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-slate-900 truncate">{notif.title}</span>
                                <Badge className={`text-xs ${severity.badge}`}>{notif.severity}</Badge>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2">{notif.message}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                <AgentIcon className="w-3 h-3" />
                                <span>{notif.agent_type}</span>
                                <span>•</span>
                                <span>{new Date(notif.created_date).toLocaleString()}</span>
                              </div>
                              
                              <div className="flex items-center gap-2 mt-2">
                                {!notif.is_read && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-xs"
                                    onClick={() => markReadMutation.mutate(notif.id)}
                                  >
                                    <Check className="w-3 h-3 mr-1" /> Mark read
                                  </Button>
                                )}
                                {notif.action_url && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-xs"
                                    onClick={() => window.location.href = notif.action_url}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" /> View
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-xs text-red-500 hover:text-red-600"
                                  onClick={() => deleteMutation.mutate(notif.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}