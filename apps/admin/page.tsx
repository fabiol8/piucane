'use client';

import { useState, useEffect } from 'react';
import { Card } from '@piucane/ui';

interface DashboardStats {
  orders: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    pending: number;
    processing: number;
    shipped: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  customers: {
    total: number;
    new: number;
    active: number;
    churnRate: number;
  };
  inventory: {
    lowStock: number;
    outOfStock: number;
    expiring: number;
    totalProducts: number;
  };
  ai: {
    conversations: number;
    urgentFlags: number;
    satisfaction: number;
  };
  subscriptions: {
    active: number;
    churnRate: number;
    mrr: number;
    growth: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'order' | 'customer' | 'inventory' | 'ai' | 'alert';
  message: string;
  timestamp: Date;
  urgent?: boolean;
  link?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    orders: {
      today: 247,
      thisWeek: 1680,
      thisMonth: 6840,
      pending: 34,
      processing: 156,
      shipped: 892
    },
    revenue: {
      today: 12450.50,
      thisWeek: 89750.25,
      thisMonth: 387950.75,
      growth: 12.3
    },
    customers: {
      total: 15847,
      new: 89,
      active: 8945,
      churnRate: 2.1
    },
    inventory: {
      lowStock: 12,
      outOfStock: 3,
      expiring: 8,
      totalProducts: 2847
    },
    ai: {
      conversations: 1247,
      urgentFlags: 5,
      satisfaction: 94.2
    },
    subscriptions: {
      active: 3247,
      churnRate: 1.8,
      mrr: 245750,
      growth: 8.7
    }
  });

  const [recentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'alert',
      message: '5 prodotti sotto scorta minima',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      urgent: true,
      link: '/admin/warehouse/inventory'
    },
    {
      id: '2',
      type: 'ai',
      message: 'Rilevato caso urgente: sintomi preoccupanti in Golden Retriever',
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
      urgent: true,
      link: '/admin/ai/conversations'
    },
    {
      id: '3',
      type: 'order',
      message: 'Nuovo ordine alto valore: €450 da cliente VIP',
      timestamp: new Date(Date.now() - 18 * 60 * 1000),
      link: '/admin/orders'
    },
    {
      id: '4',
      type: 'customer',
      message: '12 nuovi clienti registrati oggi',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      link: '/admin/customers'
    },
    {
      id: '5',
      type: 'inventory',
      message: 'Lotto cibo secco in scadenza tra 7 giorni',
      timestamp: new Date(Date.now() - 35 * 60 * 1000),
      link: '/admin/warehouse/lots'
    }
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes}m fa`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h fa`;
    const days = Math.floor(hours / 24);
    return `${days}g fa`;
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'order': return '📦';
      case 'customer': return '👥';
      case 'inventory': return '📋';
      case 'ai': return '🤖';
      case 'alert': return '⚠️';
      default: return '📝';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Panoramica delle attività PiùCane</p>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            data-cta-id="admin.dashboard.refresh.click"
          >
            🔄 Aggiorna
          </button>
          <button
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            data-cta-id="admin.dashboard.export.click"
          >
            📊 Esporta
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ordini Oggi</p>
              <p className="text-3xl font-bold text-gray-900">{stats.orders.today}</p>
              <p className="text-sm text-green-600">+12.3% vs ieri</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue Oggi</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.revenue.today)}</p>
              <p className="text-sm text-green-600">+{stats.revenue.growth}% vs ieri</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clienti Attivi</p>
              <p className="text-3xl font-bold text-gray-900">{stats.customers.active.toLocaleString()}</p>
              <p className="text-sm text-red-600">Churn: {stats.customers.churnRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Soddisfazione</p>
              <p className="text-3xl font-bold text-gray-900">{stats.ai.satisfaction}%</p>
              <p className="text-sm text-yellow-600">{stats.ai.urgentFlags} urgenti</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">🤖</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Attività Recenti</h2>
          <button
            className="text-sm text-orange-600 hover:text-orange-700"
            data-cta-id="admin.dashboard.activity.view_all"
          >
            Vedi tutto →
          </button>
        </div>

        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className={`
                flex items-start space-x-3 p-3 rounded-lg border transition-colors
                ${activity.urgent
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex-shrink-0">
                <span className="text-lg">{getActivityIcon(activity.type)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${activity.urgent ? 'text-red-900 font-medium' : 'text-gray-900'}`}>
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTimeAgo(activity.timestamp)}
                </p>
              </div>
              {activity.link && (
                <button
                  className="flex-shrink-0 text-orange-600 hover:text-orange-700"
                  data-cta-id={`admin.dashboard.activity.${activity.type}.click`}
                >
                  →
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}