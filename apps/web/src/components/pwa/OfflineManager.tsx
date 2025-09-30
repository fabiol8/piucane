/**
 * Offline Manager
 * Handles offline functionality, cache management, and background sync
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { trackAnalyticsEvent } from '@/analytics/ga4';

interface OfflineManagerProps {
  children?: React.ReactNode;
  onOfflineChange?: (isOffline: boolean) => void;
}

interface OfflineData {
  orders: any[];
  analytics: any[];
  userActions: any[];
  drafts: any[];
}

interface CacheStatus {
  size: number;
  lastUpdated: Date;
  isStale: boolean;
}

export function OfflineManager({ children, onOfflineChange }: OfflineManagerProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    orders: [],
    analytics: [],
    userActions: [],
    drafts: []
  });
  const [cacheStatus, setCacheStatus] = useState<Record<string, CacheStatus>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize offline detection
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      onOfflineChange?.(false);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOffline(true);
      onOfflineChange?.(true);
      trackAnalyticsEvent('app_went_offline', {
        timestamp: Date.now()
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize offline storage
    initializeOfflineStorage();

    // Load cached data
    loadOfflineData();

    // Check cache status
    checkCacheStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOfflineChange]);

  const initializeOfflineStorage = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Request persistent storage
        if ('storage' in navigator && 'persist' in navigator.storage) {
          const isPersistent = await navigator.storage.persist();
          console.log('Persistent storage:', isPersistent);
        }

        // Estimate storage quota
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          console.log('Storage estimate:', estimate);
        }
      } catch (error) {
        console.error('Error initializing offline storage:', error);
      }
    }
  };

  const loadOfflineData = async () => {
    try {
      const storedData = await getFromIndexedDB('offlineData');
      if (storedData) {
        setOfflineData(storedData);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  const saveOfflineData = async (data: OfflineData) => {
    try {
      await storeInIndexedDB('offlineData', data);
      setOfflineData(data);
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const addOfflineOrder = useCallback(async (order: any) => {
    const newData = {
      ...offlineData,
      orders: [...offlineData.orders, { ...order, timestamp: Date.now(), id: generateId() }]
    };
    await saveOfflineData(newData);

    trackAnalyticsEvent('offline_order_stored', {
      order_id: order.id,
      total: order.total
    });
  }, [offlineData]);

  const addOfflineAnalytics = useCallback(async (event: any) => {
    const newData = {
      ...offlineData,
      analytics: [...offlineData.analytics, { ...event, timestamp: Date.now(), id: generateId() }]
    };
    await saveOfflineData(newData);
  }, [offlineData]);

  const addOfflineUserAction = useCallback(async (action: any) => {
    const newData = {
      ...offlineData,
      userActions: [...offlineData.userActions, { ...action, timestamp: Date.now(), id: generateId() }]
    };
    await saveOfflineData(newData);
  }, [offlineData]);

  const saveDraft = useCallback(async (draft: any) => {
    const existingIndex = offlineData.drafts.findIndex(d => d.id === draft.id);
    let newDrafts;

    if (existingIndex >= 0) {
      newDrafts = [...offlineData.drafts];
      newDrafts[existingIndex] = { ...draft, lastModified: Date.now() };
    } else {
      newDrafts = [...offlineData.drafts, { ...draft, id: generateId(), lastModified: Date.now() }];
    }

    const newData = { ...offlineData, drafts: newDrafts };
    await saveOfflineData(newData);

    trackAnalyticsEvent('draft_saved_offline', {
      draft_type: draft.type,
      draft_id: draft.id
    });
  }, [offlineData]);

  const syncOfflineData = async () => {
    if (isSyncing || isOffline) return;

    setIsSyncing(true);

    try {
      // Sync orders
      for (const order of offlineData.orders) {
        try {
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(order)
          });

          if (response.ok) {
            // Remove synced order
            const newData = {
              ...offlineData,
              orders: offlineData.orders.filter(o => o.id !== order.id)
            };
            await saveOfflineData(newData);

            trackAnalyticsEvent('offline_order_synced', {
              order_id: order.id,
              sync_delay: Date.now() - order.timestamp
            });
          }
        } catch (error) {
          console.error('Error syncing order:', error);
        }
      }

      // Sync analytics
      for (const event of offlineData.analytics) {
        try {
          const response = await fetch('/api/analytics/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
          });

          if (response.ok) {
            // Remove synced event
            const newData = {
              ...offlineData,
              analytics: offlineData.analytics.filter(e => e.id !== event.id)
            };
            await saveOfflineData(newData);
          }
        } catch (error) {
          console.error('Error syncing analytics:', error);
        }
      }

      // Sync user actions
      for (const action of offlineData.userActions) {
        try {
          const response = await fetch('/api/user-actions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(action)
          });

          if (response.ok) {
            // Remove synced action
            const newData = {
              ...offlineData,
              userActions: offlineData.userActions.filter(a => a.id !== action.id)
            };
            await saveOfflineData(newData);
          }
        } catch (error) {
          console.error('Error syncing user action:', error);
        }
      }

      setLastSyncTime(new Date());

      trackAnalyticsEvent('offline_sync_completed', {
        orders_synced: offlineData.orders.length,
        analytics_synced: offlineData.analytics.length,
        actions_synced: offlineData.userActions.length
      });

    } catch (error) {
      console.error('Error during sync:', error);
      trackAnalyticsEvent('offline_sync_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const checkCacheStatus = async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const status: Record<string, CacheStatus> = {};

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();

          status[cacheName] = {
            size: keys.length,
            lastUpdated: new Date(), // Simplified - would need to track actual timestamps
            isStale: false // Would need logic to determine staleness
          };
        }

        setCacheStatus(status);
      } catch (error) {
        console.error('Error checking cache status:', error);
      }
    }
  };

  const clearCache = async (cacheName?: string) => {
    if ('caches' in window) {
      try {
        if (cacheName) {
          await caches.delete(cacheName);
        } else {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        await checkCacheStatus();

        trackAnalyticsEvent('cache_cleared', {
          cache_name: cacheName || 'all'
        });
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  };

  const precacheResources = async (urls: string[]) => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Send message to service worker to cache URLs
        registration.active?.postMessage({
          type: 'CACHE_URLS',
          urls
        });

        trackAnalyticsEvent('resources_precached', {
          url_count: urls.length
        });
      } catch (error) {
        console.error('Error precaching resources:', error);
      }
    }
  };

  const downloadForOffline = async (type: 'essential' | 'pets' | 'products') => {
    const urlsToCache = getUrlsForOfflineType(type);
    await precacheResources(urlsToCache);

    trackAnalyticsEvent('offline_download_started', {
      type,
      url_count: urlsToCache.length
    });
  };

  const getUrlsForOfflineType = (type: string): string[] => {
    switch (type) {
      case 'essential':
        return [
          '/',
          '/dogs',
          '/chat',
          '/api/breeds',
          '/api/provinces'
        ];
      case 'pets':
        return [
          '/dogs',
          '/dogs/add',
          '/api/pets',
          '/api/health/conditions'
        ];
      case 'products':
        return [
          '/shop',
          '/api/products',
          '/api/categories'
        ];
      default:
        return [];
    }
  };

  const getOfflineStats = () => {
    return {
      isOffline,
      hasOfflineData: Object.values(offlineData).some(arr => arr.length > 0),
      pendingOrders: offlineData.orders.length,
      pendingAnalytics: offlineData.analytics.length,
      pendingActions: offlineData.userActions.length,
      savedDrafts: offlineData.drafts.length,
      isSyncing,
      lastSyncTime,
      cacheStatus
    };
  };

  // IndexedDB helpers
  const getFromIndexedDB = (key: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PiuCaneOfflineDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineStore'], 'readonly');
        const store = transaction.objectStore('offlineStore');
        const getRequest = store.get(key);

        getRequest.onsuccess = () => resolve(getRequest.result?.data);
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as any).result;
        if (!db.objectStoreNames.contains('offlineStore')) {
          db.createObjectStore('offlineStore', { keyPath: 'key' });
        }
      };
    });
  };

  const storeInIndexedDB = (key: string, data: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PiuCaneOfflineDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offlineStore'], 'readwrite');
        const store = transaction.objectStore('offlineStore');
        const putRequest = store.put({ key, data, timestamp: Date.now() });

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as any).result;
        if (!db.objectStoreNames.contains('offlineStore')) {
          db.createObjectStore('offlineStore', { keyPath: 'key' });
        }
      };
    });
  };

  const generateId = () => {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  return {
    isOffline,
    offlineData,
    cacheStatus,
    isSyncing,
    lastSyncTime,
    addOfflineOrder,
    addOfflineAnalytics,
    addOfflineUserAction,
    saveDraft,
    syncOfflineData,
    clearCache,
    precacheResources,
    downloadForOffline,
    getOfflineStats,
    children
  };
}

export default OfflineManager;