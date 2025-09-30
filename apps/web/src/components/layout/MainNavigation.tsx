'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  User,
  ShoppingCart,
  Heart,
  Stethoscope,
  MessageSquare,
  Calendar,
  Bell,
  Trophy,
  Gift,
  Star,
  Target,
  Settings,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: Home
  },
  {
    label: 'Il Mio Cane',
    href: '/dogs',
    icon: Heart,
    children: [
      { label: 'Profilo Cane', href: '/dogs', icon: Heart },
      { label: 'Salute & Controlli', href: '/dogs/health', icon: Stethoscope },
      { label: 'Peso & Nutrizione', href: '/dogs/nutrition', icon: Target }
    ]
  },
  {
    label: 'AI Agents Hub',
    href: '/chat',
    icon: MessageSquare,
    children: [
      { label: 'Veterinario AI', href: '/chat?agent=veterinary', icon: Stethoscope },
      { label: 'Educatore Cinofilo', href: '/chat?agent=trainer', icon: Target },
      { label: 'Esperto Grooming', href: '/chat?agent=groomer', icon: Star }
    ]
  },
  {
    label: 'Area Veterinaria',
    href: '/veterinary',
    icon: Stethoscope,
    children: [
      { label: 'Cerca Veterinari', href: '/veterinary', icon: Stethoscope },
      { label: 'Appuntamenti', href: '/veterinary?tab=appointments', icon: Calendar },
      { label: 'Libretto Digitale', href: '/veterinary?tab=health-record', icon: Heart }
    ]
  },
  {
    label: 'Gamification',
    href: '/gamification',
    icon: Trophy,
    badge: 'New',
    children: [
      { label: 'Dashboard', href: '/gamification', icon: Trophy },
      { label: 'Le Mie Missioni', href: '/gamification/missions', icon: Target },
      { label: 'I Miei Badge', href: '/gamification/badges', icon: Star },
      { label: 'Centro Premi', href: '/gamification/rewards', icon: Gift }
    ]
  },
  {
    label: 'Shop & Abbonamenti',
    href: '/shop',
    icon: ShoppingCart,
    children: [
      { label: 'Catalogo Prodotti', href: '/shop', icon: ShoppingCart },
      { label: 'I Miei Abbonamenti', href: '/subscriptions', icon: Calendar },
      { label: 'Ordini & Resi', href: '/orders', icon: ShoppingCart }
    ]
  },
  {
    label: 'Promemoria',
    href: '/reminders',
    icon: Bell,
    children: [
      { label: 'I Miei Promemoria', href: '/reminders', icon: Bell },
      { label: 'Calendario Eventi', href: '/reminders/calendar', icon: Calendar }
    ]
  },
  {
    label: 'Il Mio Account',
    href: '/account',
    icon: User,
    children: [
      { label: 'Profilo Utente', href: '/account', icon: User },
      { label: 'Impostazioni', href: '/account/settings', icon: Settings },
      { label: 'Privacy & Consensi', href: '/account/privacy', icon: Settings }
    ]
  }
];

export default function MainNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const pathname = usePathname();

  const toggleDropdown = (label: string) => {
    const newOpen = new Set(openDropdowns);
    if (newOpen.has(label)) {
      newOpen.delete(label);
    } else {
      newOpen.add(label);
    }
    setOpenDropdowns(newOpen);
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isItemActive = (item: NavigationItem) => {
    if (isActive(item.href)) return true;
    return item.children?.some(child => isActive(child.href)) || false;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          aria-label="Apri menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Navigation */}
      <nav className={`
        fixed top-0 left-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 z-50 lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">PiùCane</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Chiudi menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full pb-20">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className={`
                      flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors flex-1
                      ${isItemActive(item)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                    onClick={() => !item.children && setIsOpen(false)}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {item.children && (
                    <button
                      onClick={() => toggleDropdown(item.label)}
                      className="p-2 ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ChevronDown
                        size={16}
                        className={`transform transition-transform ${
                          openDropdowns.has(item.label) ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Submenu */}
                {item.children && openDropdowns.has(item.label) && (
                  <div className="mt-2 ml-4 space-y-1 border-l-2 border-gray-100 pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className={`
                          flex items-center space-x-3 p-2 rounded-lg text-sm transition-colors
                          ${isActive(child.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                        onClick={() => setIsOpen(false)}
                      >
                        <child.icon size={16} />
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden lg:block bg-white shadow-sm border-r border-gray-200 w-64 fixed left-0 top-0 h-full z-30">
        <div className="p-4 border-b border-gray-200">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">PiùCane</h2>
              <p className="text-xs text-gray-500">Il tuo compagno digitale</p>
            </div>
          </Link>
        </div>

        <div className="p-4 overflow-y-auto h-full pb-20">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className={`
                      flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors flex-1
                      ${isItemActive(item)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {item.children && (
                    <button
                      onClick={() => toggleDropdown(item.label)}
                      className="p-2 ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ChevronDown
                        size={16}
                        className={`transform transition-transform ${
                          openDropdowns.has(item.label) ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Desktop Submenu */}
                {item.children && openDropdowns.has(item.label) && (
                  <div className="mt-2 ml-4 space-y-1 border-l-2 border-gray-100 pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className={`
                          flex items-center space-x-3 p-2 rounded-lg text-sm transition-colors
                          ${isActive(child.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <child.icon size={16} />
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* User Section at Bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gradient-to-r from-green-50 to-orange-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-orange-500 rounded-full flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Demo User</h4>
                  <p className="text-sm text-gray-600">Livello 12 • 2,850 XP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}