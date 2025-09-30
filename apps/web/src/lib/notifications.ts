/**
 * Sistema di notifiche completo per PiùCane
 * Supporta push notifications, in-app notifications e reminders
 */

import { trackCTA } from '@/analytics/ga4';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder';
  category: 'system' | 'veterinary' | 'orders' | 'subscriptions' | 'missions' | 'reminders';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  url?: string;
  icon?: string;
  image?: string;
  actions?: NotificationAction[];
  timestamp: number;
  expiresAt?: number;
  requiresInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ReminderData {
  id: string;
  dogId?: string;
  title: string;
  description: string;
  type: 'vaccination' | 'medication' | 'checkup' | 'grooming' | 'feeding' | 'exercise' | 'custom';
  scheduledAt: Date;
  repeatPattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  repeatInterval?: number;
  endDate?: Date;
  isCompleted: boolean;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  default: boolean;
  supported: boolean;
}

class NotificationManager {
  private registrationPromise: Promise<ServiceWorkerRegistration | null>;
  private inAppNotifications: NotificationData[] = [];
  private reminderTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.registrationPromise = this.initializeServiceWorker();
    this.loadStoredNotifications();
    this.scheduleStoredReminders();
  }

  private async initializeServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered for notifications:', registration);
        return registration;
      } catch (error) {
        console.error('SW registration failed:', error);
        return null;
      }
    }
    return null;
  }

  async requestPermission(): Promise<NotificationPermissionStatus> {
    const supported = 'Notification' in window;

    if (!supported) {
      return { granted: false, denied: false, default: false, supported: false };
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    const status = {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
      supported: true
    };

    // Track permission result
    trackCTA({
      ctaId: 'notifications.permission.request',
      event: 'permission_request',
      value: permission,
      metadata: { supported, timestamp: Date.now() }
    });

    return status;
  }

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const supported = 'Notification' in window;
    const permission = supported ? Notification.permission : 'denied';

    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
      supported
    };
  }

  async showNotification(data: NotificationData): Promise<void> {
    const registration = await this.registrationPromise;

    if (!registration) {
      this.showInAppNotification(data);
      return;
    }

    const permission = await this.getPermissionStatus();

    if (!permission.granted) {
      this.showInAppNotification(data);
      return;
    }

    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      image: data.image,
      data: {
        ...data.data,
        notificationId: data.id,
        url: data.url,
        timestamp: data.timestamp
      },
      tag: data.id,
      requireInteraction: data.requiresInteraction,
      silent: data.silent,
      vibrate: data.vibrate || [200, 100, 200],
      actions: data.actions?.map(action => ({
        action: action.action,
        title: action.title,
        icon: action.icon
      })),
      timestamp: data.timestamp
    };

    try {
      await registration.showNotification(data.title, options);

      // Store notification for in-app display
      this.storeNotification(data);

      // Track notification shown
      trackCTA({
        ctaId: 'notifications.push.shown',
        event: 'notification_shown',
        value: data.category,
        metadata: {
          type: data.type,
          priority: data.priority,
          notificationId: data.id
        }
      });
    } catch (error) {
      console.error('Failed to show push notification:', error);
      this.showInAppNotification(data);
    }
  }

  showInAppNotification(data: NotificationData): void {
    this.inAppNotifications.unshift(data);
    this.storeNotification(data);

    // Limit in-app notifications to 50
    if (this.inAppNotifications.length > 50) {
      this.inAppNotifications = this.inAppNotifications.slice(0, 50);
    }

    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('notificationReceived', {
      detail: data
    }));

    // Auto-remove non-urgent notifications after delay
    if (data.priority !== 'urgent' && data.priority !== 'high') {
      setTimeout(() => {
        this.removeInAppNotification(data.id);
      }, this.getAutoRemoveDelay(data.priority));
    }

    trackCTA({
      ctaId: 'notifications.inapp.shown',
      event: 'notification_shown',
      value: data.category,
      metadata: {
        type: data.type,
        priority: data.priority,
        notificationId: data.id
      }
    });
  }

  private getAutoRemoveDelay(priority: string): number {
    switch (priority) {
      case 'low': return 5000;
      case 'normal': return 8000;
      case 'high': return 15000;
      default: return 8000;
    }
  }

  removeInAppNotification(id: string): void {
    this.inAppNotifications = this.inAppNotifications.filter(n => n.id !== id);

    window.dispatchEvent(new CustomEvent('notificationRemoved', {
      detail: { id }
    }));
  }

  getInAppNotifications(): NotificationData[] {
    return [...this.inAppNotifications];
  }

  clearAllInAppNotifications(): void {
    this.inAppNotifications = [];
    localStorage.removeItem('piucane_notifications');

    window.dispatchEvent(new CustomEvent('notificationsCleared'));

    trackCTA({
      ctaId: 'notifications.inapp.clear_all',
      event: 'notifications_cleared',
      metadata: { timestamp: Date.now() }
    });
  }

  // Reminder system
  async scheduleReminder(reminder: ReminderData): Promise<void> {
    const now = new Date();
    const scheduledTime = new Date(reminder.scheduledAt);

    if (scheduledTime <= now) {
      // Past reminder - show immediately if not completed
      if (!reminder.isCompleted) {
        await this.triggerReminder(reminder);
      }
      return;
    }

    const delay = scheduledTime.getTime() - now.getTime();

    // Clear existing timer if any
    const existingTimer = this.reminderTimers.get(reminder.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new reminder
    const timer = setTimeout(async () => {
      await this.triggerReminder(reminder);
      this.reminderTimers.delete(reminder.id);
    }, delay);

    this.reminderTimers.set(reminder.id, timer);

    // Store reminder
    this.storeReminder(reminder);

    trackCTA({
      ctaId: 'reminders.schedule',
      event: 'reminder_scheduled',
      value: reminder.type,
      metadata: {
        dogId: reminder.dogId,
        scheduledAt: reminder.scheduledAt.toISOString(),
        reminderId: reminder.id
      }
    });
  }

  async triggerReminder(reminder: ReminderData): Promise<void> {
    const notification: NotificationData = {
      id: `reminder_${reminder.id}`,
      title: '🔔 Promemoria',
      body: reminder.title,
      type: 'reminder',
      category: 'reminders',
      priority: 'high',
      requiresInteraction: true,
      data: {
        reminderId: reminder.id,
        reminderType: reminder.type,
        dogId: reminder.dogId
      },
      url: reminder.dogId ? `/dogs/${reminder.dogId}` : '/reminders',
      actions: [
        { action: 'complete', title: 'Completato', icon: '/icons/check.png' },
        { action: 'snooze', title: 'Posticipa', icon: '/icons/clock.png' },
        { action: 'view', title: 'Visualizza', icon: '/icons/eye.png' }
      ],
      timestamp: Date.now(),
      vibrate: [300, 100, 300, 100, 300]
    };

    await this.showNotification(notification);

    // Schedule next occurrence if repeating
    if (reminder.repeatPattern && !reminder.isCompleted) {
      const nextReminder = this.calculateNextOccurrence(reminder);
      if (nextReminder) {
        await this.scheduleReminder(nextReminder);
      }
    }
  }

  private calculateNextOccurrence(reminder: ReminderData): ReminderData | null {
    if (!reminder.repeatPattern || reminder.repeatPattern === 'custom') {
      return null;
    }

    const currentDate = new Date(reminder.scheduledAt);
    const interval = reminder.repeatInterval || 1;

    switch (reminder.repeatPattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * interval));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
    }

    // Check if past end date
    if (reminder.endDate && currentDate > reminder.endDate) {
      return null;
    }

    return {
      ...reminder,
      id: `${reminder.id}_${Date.now()}`,
      scheduledAt: currentDate,
      isCompleted: false,
      completedAt: undefined
    };
  }

  cancelReminder(reminderId: string): void {
    const timer = this.reminderTimers.get(reminderId);
    if (timer) {
      clearTimeout(timer);
      this.reminderTimers.delete(reminderId);
    }

    this.removeStoredReminder(reminderId);

    trackCTA({
      ctaId: 'reminders.cancel',
      event: 'reminder_cancelled',
      metadata: { reminderId }
    });
  }

  completeReminder(reminderId: string): void {
    this.cancelReminder(reminderId);

    // Mark as completed in storage
    const reminders = this.getStoredReminders();
    const reminder = reminders.find(r => r.id === reminderId);
    if (reminder) {
      reminder.isCompleted = true;
      reminder.completedAt = new Date();
      this.storeReminder(reminder);
    }

    trackCTA({
      ctaId: 'reminders.complete',
      event: 'reminder_completed',
      metadata: { reminderId }
    });
  }

  snoozeReminder(reminderId: string, minutes: number = 15): void {
    const reminders = this.getStoredReminders();
    const reminder = reminders.find(r => r.id === reminderId);

    if (reminder) {
      const newScheduledAt = new Date(Date.now() + (minutes * 60 * 1000));
      const snoozedReminder: ReminderData = {
        ...reminder,
        id: `${reminder.id}_snoozed_${Date.now()}`,
        scheduledAt: newScheduledAt
      };

      this.scheduleReminder(snoozedReminder);
    }

    trackCTA({
      ctaId: 'reminders.snooze',
      event: 'reminder_snoozed',
      metadata: { reminderId, snoozeMinutes: minutes }
    });
  }

  // Storage helpers
  private storeNotification(notification: NotificationData): void {
    const stored = this.getStoredNotifications();
    const updated = [notification, ...stored.filter(n => n.id !== notification.id)];

    // Keep only last 100 notifications
    const limited = updated.slice(0, 100);

    localStorage.setItem('piucane_notifications', JSON.stringify(limited));
  }

  private getStoredNotifications(): NotificationData[] {
    try {
      const stored = localStorage.getItem('piucane_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private loadStoredNotifications(): void {
    this.inAppNotifications = this.getStoredNotifications()
      .filter(n => !n.expiresAt || n.expiresAt > Date.now())
      .slice(0, 50);
  }

  private storeReminder(reminder: ReminderData): void {
    const stored = this.getStoredReminders();
    const updated = [reminder, ...stored.filter(r => r.id !== reminder.id)];

    localStorage.setItem('piucane_reminders', JSON.stringify(updated));
  }

  private getStoredReminders(): ReminderData[] {
    try {
      const stored = localStorage.getItem('piucane_reminders');
      const reminders = stored ? JSON.parse(stored) : [];

      // Convert date strings back to Date objects
      return reminders.map((r: any) => ({
        ...r,
        scheduledAt: new Date(r.scheduledAt),
        endDate: r.endDate ? new Date(r.endDate) : undefined,
        completedAt: r.completedAt ? new Date(r.completedAt) : undefined
      }));
    } catch {
      return [];
    }
  }

  private removeStoredReminder(reminderId: string): void {
    const stored = this.getStoredReminders();
    const filtered = stored.filter(r => r.id !== reminderId);
    localStorage.setItem('piucane_reminders', JSON.stringify(filtered));
  }

  private scheduleStoredReminders(): void {
    const reminders = this.getStoredReminders();

    for (const reminder of reminders) {
      if (!reminder.isCompleted) {
        this.scheduleReminder(reminder);
      }
    }
  }

  // Quick notification helpers
  async showSuccess(title: string, body: string, options?: Partial<NotificationData>): Promise<void> {
    await this.showNotification({
      id: `success_${Date.now()}`,
      title,
      body,
      type: 'success',
      category: 'system',
      priority: 'normal',
      timestamp: Date.now(),
      ...options
    });
  }

  async showError(title: string, body: string, options?: Partial<NotificationData>): Promise<void> {
    await this.showNotification({
      id: `error_${Date.now()}`,
      title,
      body,
      type: 'error',
      category: 'system',
      priority: 'high',
      requiresInteraction: true,
      timestamp: Date.now(),
      ...options
    });
  }

  async showInfo(title: string, body: string, options?: Partial<NotificationData>): Promise<void> {
    await this.showNotification({
      id: `info_${Date.now()}`,
      title,
      body,
      type: 'info',
      category: 'system',
      priority: 'normal',
      timestamp: Date.now(),
      ...options
    });
  }

  async showWarning(title: string, body: string, options?: Partial<NotificationData>): Promise<void> {
    await this.showNotification({
      id: `warning_${Date.now()}`,
      title,
      body,
      type: 'warning',
      category: 'system',
      priority: 'high',
      timestamp: Date.now(),
      ...options
    });
  }
}

export const notificationManager = new NotificationManager();

// Helper functions for common notification types
export async function showVetReminder(dogName: string, appointmentDate: Date, vetName?: string) {
  await notificationManager.showNotification({
    id: `vet_reminder_${Date.now()}`,
    title: '🩺 Appuntamento veterinario',
    body: `Ricorda l'appuntamento di ${dogName}${vetName ? ` dal Dr. ${vetName}` : ''}`,
    type: 'reminder',
    category: 'veterinary',
    priority: 'high',
    requiresInteraction: true,
    data: { dogName, appointmentDate: appointmentDate.toISOString(), vetName },
    url: '/veterinary',
    actions: [
      { action: 'confirm', title: 'Confermato', icon: '/icons/check.png' },
      { action: 'reschedule', title: 'Riprogramma', icon: '/icons/calendar.png' }
    ],
    timestamp: Date.now(),
    vibrate: [200, 100, 200]
  });
}

export async function showOrderUpdate(orderNumber: string, status: string, trackingUrl?: string) {
  await notificationManager.showNotification({
    id: `order_${orderNumber}_${Date.now()}`,
    title: '📦 Aggiornamento ordine',
    body: `Il tuo ordine #${orderNumber} è ${status}`,
    type: 'info',
    category: 'orders',
    priority: 'normal',
    data: { orderNumber, status, trackingUrl },
    url: `/orders/${orderNumber}`,
    actions: trackingUrl ? [
      { action: 'track', title: 'Traccia', icon: '/icons/truck.png' },
      { action: 'view', title: 'Dettagli', icon: '/icons/eye.png' }
    ] : undefined,
    timestamp: Date.now()
  });
}

export async function showMissionComplete(missionTitle: string, reward: string, xp: number) {
  await notificationManager.showNotification({
    id: `mission_complete_${Date.now()}`,
    title: '🎉 Missione completata!',
    body: `Hai completato "${missionTitle}" e guadagnato ${xp} XP!`,
    type: 'success',
    category: 'missions',
    priority: 'normal',
    data: { missionTitle, reward, xp },
    url: '/missions',
    actions: [
      { action: 'collect', title: 'Ritira premio', icon: '/icons/gift.png' },
      { action: 'continue', title: 'Continua', icon: '/icons/arrow-right.png' }
    ],
    timestamp: Date.now(),
    vibrate: [100, 50, 100, 50, 200]
  });
}