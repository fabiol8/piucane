'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Clock, Eye, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { notificationManager, NotificationData } from '@/lib/notifications';
import { trackCTA } from '@/analytics/ga4';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load initial notifications
    const initialNotifications = notificationManager.getInAppNotifications();
    setNotifications(initialNotifications);
    setUnreadCount(initialNotifications.length);

    // Listen for new notifications
    const handleNewNotification = (event: CustomEvent) => {
      const newNotification = event.detail as NotificationData;
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleNotificationRemoved = (event: CustomEvent) => {
      const { id } = event.detail;
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleNotificationsCleared = () => {
      setNotifications([]);
      setUnreadCount(0);
    };

    window.addEventListener('notificationReceived', handleNewNotification as EventListener);
    window.addEventListener('notificationRemoved', handleNotificationRemoved as EventListener);
    window.addEventListener('notificationsCleared', handleNotificationsCleared);

    return () => {
      window.removeEventListener('notificationReceived', handleNewNotification as EventListener);
      window.removeEventListener('notificationRemoved', handleNotificationRemoved as EventListener);
      window.removeEventListener('notificationsCleared', handleNotificationsCleared);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);

    trackCTA({
      ctaId: 'notifications.center.toggle',
      event: 'notification_center_toggled',
      value: isOpen ? 'close' : 'open',
      metadata: { notificationCount: notifications.length }
    });

    if (!isOpen) {
      // Mark all as read when opening
      setUnreadCount(0);
    }
  };

  const handleNotificationAction = (notification: NotificationData, action: string) => {
    trackCTA({
      ctaId: `notifications.action.${action}`,
      event: 'notification_action',
      value: action,
      metadata: {
        notificationId: notification.id,
        notificationType: notification.type,
        category: notification.category
      }
    });

    switch (action) {
      case 'dismiss':
        notificationManager.removeInAppNotification(notification.id);
        break;
      case 'complete':
        if (notification.data?.reminderId) {
          notificationManager.completeReminder(notification.data.reminderId);
        }
        notificationManager.removeInAppNotification(notification.id);
        break;
      case 'snooze':
        if (notification.data?.reminderId) {
          notificationManager.snoozeReminder(notification.data.reminderId, 15);
        }
        notificationManager.removeInAppNotification(notification.id);
        break;
      case 'view':
        if (notification.url) {
          window.location.href = notification.url;
        }
        break;
    }
  };

  const handleClearAll = () => {
    notificationManager.clearAllInAppNotifications();
    setIsOpen(false);
  };

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: NotificationData['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'normal':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-gray-400';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="relative"
        data-cta-id="notifications.center.toggle"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
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
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white rounded-lg shadow-lg border z-50 max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Notifiche</h3>
                    {notifications.length > 0 && (
                      <Badge variant="secondary">{notifications.length}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        data-cta-id="notifications.center.clear_all"
                      >
                        Pulisci tutto
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      data-cta-id="notifications.center.close"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nessuna notifica</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onAction={handleNotificationAction}
                        getPriorityColor={getPriorityColor}
                        getNotificationIcon={getNotificationIcon}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationData;
  onAction: (notification: NotificationData, action: string) => void;
  getPriorityColor: (priority: NotificationData['priority']) => string;
  getNotificationIcon: (type: NotificationData['type']) => React.ReactNode;
}

function NotificationItem({
  notification,
  onAction,
  getPriorityColor,
  getNotificationIcon
}: NotificationItemProps) {
  return (
    <div className={`px-4 py-3 border-l-4 ${getPriorityColor(notification.priority)} hover:bg-gray-50 transition-colors`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {notification.body}
              </p>

              {/* Category badge */}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {notification.category}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(notification.timestamp), {
                    addSuffix: true,
                    locale: it
                  })}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction(notification, 'dismiss')}
              className="flex-shrink-0"
              data-cta-id="notifications.item.dismiss"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Action buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {notification.actions.map((action) => (
                <Button
                  key={action.action}
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(notification, action.action)}
                  className="text-xs"
                  data-cta-id={`notifications.item.${action.action}`}
                >
                  {action.action === 'complete' && <Check className="w-3 h-3 mr-1" />}
                  {action.action === 'snooze' && <Clock className="w-3 h-3 mr-1" />}
                  {action.action === 'view' && <Eye className="w-3 h-3 mr-1" />}
                  {action.title}
                </Button>
              ))}
            </div>
          )}

          {/* Click to navigate */}
          {notification.url && (
            <button
              onClick={() => onAction(notification, 'view')}
              className="text-xs text-blue-600 hover:text-blue-800 mt-2"
              data-cta-id="notifications.item.navigate"
            >
              Visualizza dettagli →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}