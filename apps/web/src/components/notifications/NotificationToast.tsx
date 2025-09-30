'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Info, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationData } from '@/lib/notifications';
import { trackCTA } from '@/analytics/ga4';

interface ToastNotification extends NotificationData {
  isVisible: boolean;
  autoRemove?: boolean;
}

interface NotificationToastProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export function NotificationToast({ position = 'top-right', maxToasts = 5 }: NotificationToastProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const handleNewNotification = (event: CustomEvent) => {
      const notification = event.detail as NotificationData;

      // Only show high priority notifications as toasts
      if (notification.priority === 'urgent' || notification.priority === 'high') {
        showToast(notification);
      }
    };

    window.addEventListener('notificationReceived', handleNewNotification as EventListener);

    return () => {
      window.removeEventListener('notificationReceived', handleNewNotification as EventListener);
    };
  }, []);

  const showToast = (notification: NotificationData) => {
    const toast: ToastNotification = {
      ...notification,
      isVisible: true,
      autoRemove: notification.priority !== 'urgent'
    };

    setToasts(prev => {
      const newToasts = [toast, ...prev];
      // Limit number of toasts
      return newToasts.slice(0, maxToasts);
    });

    // Auto-remove non-urgent toasts
    if (toast.autoRemove) {
      setTimeout(() => {
        removeToast(notification.id);
      }, getAutoRemoveDelay(notification.priority));
    }

    trackCTA({
      ctaId: 'notifications.toast.shown',
      event: 'toast_notification_shown',
      value: notification.category,
      metadata: {
        type: notification.type,
        priority: notification.priority,
        notificationId: notification.id
      }
    });
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getAutoRemoveDelay = (priority: string): number => {
    switch (priority) {
      case 'high': return 8000;
      case 'normal': return 6000;
      case 'low': return 4000;
      default: return 6000;
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
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

  const getToastColors = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'reminder':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      <div className="space-y-2 w-80 max-w-[90vw]">
        <AnimatePresence>
          {toasts.map((toast, index) => (
            <motion.div
              key={toast.id}
              initial={{
                opacity: 0,
                x: position.includes('right') ? 300 : position.includes('left') ? -300 : 0,
                y: position.includes('top') ? -50 : position.includes('bottom') ? 50 : 0,
                scale: 0.8
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1
              }}
              exit={{
                opacity: 0,
                x: position.includes('right') ? 300 : position.includes('left') ? -300 : 0,
                scale: 0.8
              }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
                delay: index * 0.1
              }}
              className={`
                relative rounded-lg border p-4 shadow-lg backdrop-blur-sm
                ${getToastColors(toast.type)}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {getNotificationIcon(toast.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold mb-1">
                    {toast.title}
                  </h4>
                  <p className="text-sm opacity-90 mb-3">
                    {toast.body}
                  </p>

                  {/* Actions */}
                  {toast.actions && toast.actions.length > 0 && (
                    <div className="flex items-center gap-2">
                      {toast.actions.slice(0, 2).map((action) => (
                        <Button
                          key={action.action}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Handle action based on type
                            trackCTA({
                              ctaId: `notifications.toast.${action.action}`,
                              event: 'toast_action',
                              value: action.action,
                              metadata: { notificationId: toast.id }
                            });

                            if (action.action === 'view' && toast.url) {
                              window.location.href = toast.url;
                            }

                            removeToast(toast.id);
                          }}
                          className="text-xs bg-white/80 hover:bg-white"
                          data-cta-id={`notifications.toast.${action.action}`}
                        >
                          {action.title}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    trackCTA({
                      ctaId: 'notifications.toast.dismiss',
                      event: 'toast_dismissed',
                      metadata: { notificationId: toast.id }
                    });
                    removeToast(toast.id);
                  }}
                  className="flex-shrink-0 hover:bg-white/50"
                  data-cta-id="notifications.toast.dismiss"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress bar for auto-remove */}
              {toast.autoRemove && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{
                    duration: getAutoRemoveDelay(toast.priority) / 1000,
                    ease: 'linear'
                  }}
                  className="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-b-lg"
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Hook for programmatically showing toasts
export function useToast() {
  const showToast = (notification: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const toast: NotificationData = {
      ...notification,
      id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    window.dispatchEvent(new CustomEvent('notificationReceived', {
      detail: toast
    }));
  };

  const showSuccess = (title: string, body: string, options?: Partial<NotificationData>) => {
    showToast({
      title,
      body,
      type: 'success',
      category: 'system',
      priority: 'normal',
      ...options
    });
  };

  const showError = (title: string, body: string, options?: Partial<NotificationData>) => {
    showToast({
      title,
      body,
      type: 'error',
      category: 'system',
      priority: 'high',
      ...options
    });
  };

  const showWarning = (title: string, body: string, options?: Partial<NotificationData>) => {
    showToast({
      title,
      body,
      type: 'warning',
      category: 'system',
      priority: 'high',
      ...options
    });
  };

  const showInfo = (title: string, body: string, options?: Partial<NotificationData>) => {
    showToast({
      title,
      body,
      type: 'info',
      category: 'system',
      priority: 'normal',
      ...options
    });
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}