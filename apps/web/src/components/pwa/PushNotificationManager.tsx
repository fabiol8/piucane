/**
 * Push Notification Manager
 * Handles push notification subscription and management
 */

'use client';

import { useEffect, useState } from 'react';
import { trackAnalyticsEvent } from '@/analytics/ga4';

interface PushNotificationManagerProps {
  userId?: string;
  onPermissionChange?: (permission: NotificationPermission) => void;
}

interface NotificationPreferences {
  healthReminders: boolean;
  missionUpdates: boolean;
  shopPromotions: boolean;
  aiRecommendations: boolean;
  orderUpdates: boolean;
  communityUpdates: boolean;
}

export function PushNotificationManager({ userId, onPermissionChange }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    healthReminders: true,
    missionUpdates: true,
    shopPromotions: false,
    aiRecommendations: true,
    orderUpdates: true,
    communityUpdates: false
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkExistingSubscription();
      loadPreferences();
    }
  }, [userId]);

  useEffect(() => {
    onPermissionChange?.(permission);
  }, [permission, onPermissionChange]);

  const checkExistingSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
          setSubscription(existingSubscription);
          setIsSubscribed(true);

          // Verify subscription is still valid on server
          await verifySubscription(existingSubscription);
        }
      } catch (error) {
        console.error('Error checking existing subscription:', error);
      }
    }
  };

  const loadPreferences = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/users/${userId}/notification-preferences`);
      if (response.ok) {
        const prefs = await response.json();
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Questo browser non supporta le notifiche push');
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      trackAnalyticsEvent('notification_permission_requested', {
        user_id: userId,
        result,
        source: 'manual'
      });

      if (result === 'granted') {
        await subscribeToPush();
        return true;
      } else {
        trackAnalyticsEvent('notification_permission_denied', {
          user_id: userId,
          source: 'manual'
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push messaging is not supported');
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/push/vapid-key');
      const { publicKey } = await vapidResponse.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      setSubscription(subscription);
      setIsSubscribed(true);

      // Send subscription to server
      await sendSubscriptionToServer(subscription);

      trackAnalyticsEvent('push_subscription_created', {
        user_id: userId,
        endpoint: subscription.endpoint
      });

      // Show welcome notification
      await showWelcomeNotification();

    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      trackAnalyticsEvent('push_subscription_failed', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userId,
        preferences
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription on server');
    }
  };

  const verifySubscription = async (subscription: PushSubscription) => {
    try {
      const response = await fetch('/api/push/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          userId
        })
      });

      if (!response.ok) {
        // Subscription is invalid, unsubscribe
        await unsubscribeFromPush();
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();

      // Remove subscription from server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          userId
        })
      });

      setSubscription(null);
      setIsSubscribed(false);

      trackAnalyticsEvent('push_subscription_removed', {
        user_id: userId
      });

    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
  };

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);

    if (!userId) return;

    try {
      const response = await fetch(`/api/users/${userId}/notification-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(newPreferences)
      });

      if (response.ok) {
        trackAnalyticsEvent('notification_preferences_updated', {
          user_id: userId,
          preferences: newPreferences
        });
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  };

  const showWelcomeNotification = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;

      await registration.showNotification('Benvenuto in PiùCane! 🐕', {
        body: 'Le notifiche sono attive. Ti terremo aggiornato sulla salute del tuo cane.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'welcome',
        requireInteraction: false,
        actions: [
          {
            action: 'explore',
            title: 'Esplora',
            icon: '/icons/action-explore.png'
          }
        ],
        data: {
          url: '/dogs',
          type: 'welcome'
        }
      });
    }
  };

  const testNotification = async () => {
    if (!isSubscribed) {
      alert('Prima devi abilitare le notifiche');
      return;
    }

    try {
      await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId,
          message: 'Questa è una notifica di test!'
        })
      });

      trackAnalyticsEvent('test_notification_sent', {
        user_id: userId
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const scheduleHealthReminder = async (petId: string, reminderType: string, scheduledFor: Date) => {
    if (!isSubscribed || !preferences.healthReminders) return;

    try {
      await fetch('/api/push/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          userId,
          petId,
          type: 'health_reminder',
          reminderType,
          scheduledFor: scheduledFor.toISOString(),
          data: {
            title: 'Promemoria Salute 🏥',
            body: `È ora di ${reminderType} per il tuo cane`,
            url: `/dogs/${petId}/health`
          }
        })
      });

      trackAnalyticsEvent('health_reminder_scheduled', {
        user_id: userId,
        pet_id: petId,
        reminder_type: reminderType,
        scheduled_for: scheduledFor.toISOString()
      });
    } catch (error) {
      console.error('Error scheduling health reminder:', error);
    }
  };

  // Utility function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return {
    permission,
    isSubscribed,
    subscription,
    preferences,
    isLoading,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    updatePreferences,
    testNotification,
    scheduleHealthReminder
  };
}

export default PushNotificationManager;