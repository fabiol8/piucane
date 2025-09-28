'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Card } from '@piucane/ui';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  children?: MenuItem[];
  badge?: number;
  permissions?: string[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/admin'
  },
  {
    id: 'orders',
    label: 'Ordini',
    icon: '📦',
    children: [
      { id: 'orders-list', label: 'Lista Ordini', icon: '📋', path: '/admin/orders' },
      { id: 'orders-pending', label: 'In Attesa', icon: '⏳', path: '/admin/orders/pending' },
      { id: 'orders-shipping', label: 'Spedizioni', icon: '🚚', path: '/admin/orders/shipping' },
      { id: 'orders-returns', label: 'Resi', icon: '↩️', path: '/admin/orders/returns' }
    ]
  },
  {
    id: 'customers',
    label: 'Clienti',
    icon: '👥',
    children: [
      { id: 'customers-list', label: 'Lista Clienti', icon: '📋', path: '/admin/customers' },
      { id: 'customers-segments', label: 'Segmenti', icon: '🎯', path: '/admin/customers/segments' },
      { id: 'customers-journeys', label: 'Customer Journey', icon: '🛤️', path: '/admin/customers/journeys' },
      { id: 'customers-analytics', label: 'Analytics', icon: '📈', path: '/admin/customers/analytics' }
    ]
  },
  {
    id: 'products',
    label: 'Prodotti',
    icon: '🏷️',
    children: [
      { id: 'products-catalog', label: 'Catalogo', icon: '📚', path: '/admin/products' },
      { id: 'products-categories', label: 'Categorie', icon: '📁', path: '/admin/products/categories' },
      { id: 'products-brands', label: 'Brand', icon: '🏪', path: '/admin/products/brands' },
      { id: 'products-pricing', label: 'Prezzi', icon: '💰', path: '/admin/products/pricing' }
    ]
  },
  {
    id: 'subscriptions',
    label: 'Abbonamenti',
    icon: '🔄',
    children: [
      { id: 'subscriptions-active', label: 'Attivi', icon: '✅', path: '/admin/subscriptions/active' },
      { id: 'subscriptions-cancelled', label: 'Cancellati', icon: '❌', path: '/admin/subscriptions/cancelled' },
      { id: 'subscriptions-plans', label: 'Piani', icon: '📋', path: '/admin/subscriptions/plans' },
      { id: 'subscriptions-analytics', label: 'Analytics', icon: '📊', path: '/admin/subscriptions/analytics' }
    ]
  },
  {
    id: 'warehouse',
    label: 'Magazzino',
    icon: '🏭',
    children: [
      { id: 'warehouse-inventory', label: 'Inventario', icon: '📦', path: '/admin/warehouse/inventory' },
      { id: 'warehouse-lots', label: 'Lotti', icon: '🏷️', path: '/admin/warehouse/lots' },
      { id: 'warehouse-picking', label: 'Picking', icon: '📋', path: '/admin/warehouse/picking' },
      { id: 'warehouse-packing', label: 'Packing', icon: '📦', path: '/admin/warehouse/packing' },
      { id: 'warehouse-receiving', label: 'Ricevimento', icon: '🚛', path: '/admin/warehouse/receiving' },
      { id: 'warehouse-cycle-count', label: 'Conteggi', icon: '🔢', path: '/admin/warehouse/cycle-count' }
    ]
  },
  {
    id: 'messaging',
    label: 'Messaggistica',
    icon: '💬',
    children: [
      { id: 'messaging-campaigns', label: 'Campagne', icon: '📢', path: '/admin/messaging/campaigns' },
      { id: 'messaging-templates', label: 'Template', icon: '📝', path: '/admin/messaging/templates' },
      { id: 'messaging-inbox', label: 'Inbox', icon: '📬', path: '/admin/messaging/inbox' },
      { id: 'messaging-analytics', label: 'Analytics', icon: '📊', path: '/admin/messaging/analytics' }
    ]
  },
  {
    id: 'ai',
    label: 'AI & Automazione',
    icon: '🤖',
    children: [
      { id: 'ai-conversations', label: 'Conversazioni', icon: '💬', path: '/admin/ai/conversations' },
      { id: 'ai-agents', label: 'Agenti', icon: '🎭', path: '/admin/ai/agents' },
      { id: 'ai-training', label: 'Training', icon: '📚', path: '/admin/ai/training' },
      { id: 'ai-analytics', label: 'Analytics', icon: '📈', path: '/admin/ai/analytics' }
    ]
  },
  {
    id: 'gamification',
    label: 'Gamification',
    icon: '🎮',
    children: [
      { id: 'gamification-missions', label: 'Missioni', icon: '🎯', path: '/admin/gamification/missions' },
      { id: 'gamification-badges', label: 'Badge', icon: '🏆', path: '/admin/gamification/badges' },
      { id: 'gamification-rewards', label: 'Ricompense', icon: '🎁', path: '/admin/gamification/rewards' },
      { id: 'gamification-leaderboard', label: 'Classifica', icon: '📊', path: '/admin/gamification/leaderboard' }
    ]
  },
  {
    id: 'content',
    label: 'Contenuti',
    icon: '📝',
    children: [
      { id: 'content-cms', label: 'CMS', icon: '📄', path: '/admin/content/cms' },
      { id: 'content-media', label: 'Media', icon: '🖼️', path: '/admin/content/media' },
      { id: 'content-seo', label: 'SEO', icon: '🔍', path: '/admin/content/seo' },
      { id: 'content-blog', label: 'Blog', icon: '📰', path: '/admin/content/blog' }
    ]
  },
  {
    id: 'health',
    label: 'Salute & Vet',
    icon: '🩺',
    children: [
      { id: 'health-profiles', label: 'Profili Cani', icon: '🐕', path: '/admin/health/profiles' },
      { id: 'health-vaccines', label: 'Vaccini', icon: '💉', path: '/admin/health/vaccines' },
      { id: 'health-reminders', label: 'Promemoria', icon: '⏰', path: '/admin/health/reminders' },
      { id: 'health-vets', label: 'Veterinari', icon: '👨‍⚕️', path: '/admin/health/vets' }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📊',
    children: [
      { id: 'analytics-overview', label: 'Panoramica', icon: '📈', path: '/admin/analytics' },
      { id: 'analytics-sales', label: 'Vendite', icon: '💰', path: '/admin/analytics/sales' },
      { id: 'analytics-users', label: 'Utenti', icon: '👥', path: '/admin/analytics/users' },
      { id: 'analytics-products', label: 'Prodotti', icon: '📦', path: '/admin/analytics/products' },
      { id: 'analytics-cta', label: 'CTA Tracking', icon: '🎯', path: '/admin/analytics/cta' }
    ]
  },
  {
    id: 'settings',
    label: 'Configurazioni',
    icon: '⚙️',
    children: [
      { id: 'settings-general', label: 'Generali', icon: '🔧', path: '/admin/settings/general' },
      { id: 'settings-onboarding', label: 'Onboarding', icon: '🚀', path: '/admin/settings/onboarding' },
      { id: 'settings-cmp', label: 'CMP & Privacy', icon: '🔒', path: '/admin/settings/cmp' },
      { id: 'settings-integrations', label: 'Integrazioni', icon: '🔗', path: '/admin/settings/integrations' },
      { id: 'settings-team', label: 'Team', icon: '👥', path: '/admin/settings/team' },
      { id: 'settings-roles', label: 'Ruoli', icon: '🛡️', path: '/admin/settings/roles' }
    ]
  }
];

export default function AdminSidebar() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['dashboard']));
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isActiveItem = (item: MenuItem): boolean => {
    if (item.path) {
      return pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
    }
    return item.children?.some(child => isActiveItem(child)) || false;
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const isActive = isActiveItem(item);
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="w-full">
        {item.path ? (
          <Link
            href={item.path}
            className={`
              flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors
              ${level > 0 ? 'ml-4 pl-6' : ''}
              ${isActive
                ? 'bg-orange-100 text-orange-900 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
              }
            `}
            data-cta-id={`admin.sidebar.${item.id}.click`}
          >
            <span className="mr-3">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        ) : (
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`
              flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors
              ${level > 0 ? 'ml-4 pl-6' : ''}
              ${isActive
                ? 'bg-orange-50 text-orange-900 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
              }
            `}
            data-cta-id={`admin.sidebar.${item.id}.expand`}
          >
            <span className="mr-3">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                    {item.badge}
                  </span>
                )}
                <span className={`ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
              </>
            )}
          </button>
        )}

        {/* Render children */}
        {hasChildren && (isExpanded || collapsed) && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`
      h-full bg-white border-r border-gray-200 transition-all duration-300
      ${collapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🐕</span>
            <span className="text-xl font-bold text-orange-600">PiùCane</span>
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">ADMIN</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          data-cta-id="admin.sidebar.collapse.toggle"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Quick Stats */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <Card padding="sm" className="text-center">
              <div className="text-lg font-bold text-green-600">1,247</div>
              <div className="text-xs text-gray-600">Ordini oggi</div>
            </Card>
            <Card padding="sm" className="text-center">
              <div className="text-lg font-bold text-blue-600">€12,450</div>
              <div className="text-xs text-gray-600">Revenue oggi</div>
            </Card>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {menuItems.map(item => renderMenuItem(item))}
        </div>
      </nav>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">AM</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                Admin User
              </div>
              <div className="text-xs text-gray-500 truncate">
                admin@piucane.it
              </div>
            </div>
            <button
              className="text-gray-400 hover:text-gray-600"
              data-cta-id="admin.sidebar.logout.click"
            >
              🚪
            </button>
          </div>
        </div>
      )}
    </div>
  );
}