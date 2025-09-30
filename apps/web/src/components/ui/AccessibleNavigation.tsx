'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useListFocus, useRovingTabIndex } from '@/lib/accessibility/focus-management';
import { ScreenReaderOnly } from './ScreenReaderOnly';
import { Button } from './Button';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  description?: string;
  children?: NavigationItem[];
}

interface AccessibleNavigationProps {
  items: NavigationItem[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'sidebar';
}

export function AccessibleNavigation({
  items,
  orientation = 'horizontal',
  className,
  label = 'Navigazione principale',
  variant = 'primary',
}: AccessibleNavigationProps) {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const { setItemRef, handleKeyDown, focusItem } = useListFocus(
    items,
    (item, index) => {
      setActiveIndex(index);
      if (item.children) {
        setOpenSubmenu(openSubmenu === item.id ? null : item.id);
      }
    },
    orientation
  );

  const variantStyles = {
    primary: {
      nav: 'bg-white border-b border-gray-200',
      list: 'flex space-x-8',
      item: 'text-gray-700 hover:text-blue-600 focus:text-blue-600',
      activeItem: 'text-blue-600 border-b-2 border-blue-600',
    },
    secondary: {
      nav: 'bg-gray-50',
      list: 'flex space-x-4',
      item: 'text-gray-600 hover:text-gray-900 focus:text-gray-900',
      activeItem: 'text-gray-900 bg-white rounded-md',
    },
    sidebar: {
      nav: 'bg-gray-900',
      list: 'space-y-1',
      item: 'text-gray-300 hover:text-white hover:bg-gray-700 focus:text-white focus:bg-gray-700',
      activeItem: 'text-white bg-gray-700',
    },
  };

  const styles = variantStyles[variant];

  return (
    <nav
      aria-label={label}
      className={cn(styles.nav, className)}
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-7xl mx-auto px-4">
        <ul
          role="menubar"
          className={cn(
            styles.list,
            orientation === 'vertical' && 'flex-col space-x-0 space-y-2'
          )}
        >
          {items.map((item, index) => (
            <NavigationItemComponent
              key={item.id}
              item={item}
              index={index}
              isActive={pathname === item.href}
              isFocused={activeIndex === index}
              hasSubmenu={!!item.children}
              isSubmenuOpen={openSubmenu === item.id}
              onToggleSubmenu={() =>
                setOpenSubmenu(openSubmenu === item.id ? null : item.id)
              }
              setItemRef={setItemRef}
              styles={styles}
              orientation={orientation}
            />
          ))}
        </ul>
      </div>
    </nav>
  );
}

interface NavigationItemComponentProps {
  item: NavigationItem;
  index: number;
  isActive: boolean;
  isFocused: boolean;
  hasSubmenu: boolean;
  isSubmenuOpen: boolean;
  onToggleSubmenu: () => void;
  setItemRef: (index: number, element: HTMLElement | null) => void;
  styles: any;
  orientation: 'horizontal' | 'vertical';
}

function NavigationItemComponent({
  item,
  index,
  isActive,
  isFocused,
  hasSubmenu,
  isSubmenuOpen,
  onToggleSubmenu,
  setItemRef,
  styles,
  orientation,
}: NavigationItemComponentProps) {
  const { getProps } = useRovingTabIndex(isFocused);
  const submenuRef = useRef<HTMLUListElement>(null);

  const handleSubmenuKeyDown = (e: React.KeyboardEvent) => {
    if (!hasSubmenu || !isSubmenuOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onToggleSubmenu();
      // Focus back to parent item
      const parentItem = document.querySelector(`[data-nav-index="${index}"]`) as HTMLElement;
      parentItem?.focus();
    }
  };

  return (
    <li
      role="none"
      className="relative"
      onKeyDown={handleSubmenuKeyDown}
    >
      {hasSubmenu ? (
        <>
          <button
            ref={(el) => setItemRef(index, el)}
            data-nav-index={index}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={isSubmenuOpen}
            aria-describedby={item.description ? `${item.id}-desc` : undefined}
            className={cn(
              'flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              styles.item,
              isActive && styles.activeItem
            )}
            onClick={onToggleSubmenu}
            {...getProps(isFocused)}
          >
            {item.icon && (
              <span className="mr-3 flex-shrink-0" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span
                className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                aria-label={`${item.badge} notifiche`}
              >
                {item.badge}
              </span>
            )}
            <svg
              className={cn(
                'ml-2 h-4 w-4 transition-transform',
                isSubmenuOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {item.description && (
            <ScreenReaderOnly>
              <div id={`${item.id}-desc`}>{item.description}</div>
            </ScreenReaderOnly>
          )}

          {isSubmenuOpen && item.children && (
            <ul
              ref={submenuRef}
              role="menu"
              aria-label={`Sottomenu di ${item.label}`}
              className={cn(
                'absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10',
                orientation === 'vertical' && 'relative mt-2 ml-6 w-auto bg-transparent border-0 shadow-none'
              )}
            >
              {item.children.map((child) => (
                <li key={child.id} role="none">
                  <Link
                    href={child.href}
                    role="menuitem"
                    className={cn(
                      'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                      pathname === child.href && 'bg-blue-50 text-blue-600'
                    )}
                  >
                    <div className="flex items-center">
                      {child.icon && (
                        <span className="mr-3 flex-shrink-0" aria-hidden="true">
                          {child.icon}
                        </span>
                      )}
                      <span>{child.label}</span>
                      {child.badge && (
                        <span
                          className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                          aria-label={`${child.badge} notifiche`}
                        >
                          {child.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <Link
            ref={(el) => setItemRef(index, el)}
            data-nav-index={index}
            href={item.href}
            role="menuitem"
            aria-current={isActive ? 'page' : undefined}
            aria-describedby={item.description ? `${item.id}-desc` : undefined}
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              styles.item,
              isActive && styles.activeItem
            )}
            {...getProps(isFocused)}
          >
            {item.icon && (
              <span className="mr-3 flex-shrink-0" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {item.badge && (
              <span
                className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                aria-label={`${item.badge} notifiche`}
              >
                {item.badge}
              </span>
            )}
          </Link>

          {item.description && (
            <ScreenReaderOnly>
              <div id={`${item.id}-desc`}>{item.description}</div>
            </ScreenReaderOnly>
          )}
        </>
      )}
    </li>
  );
}

// Breadcrumb Navigation Component
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Percorso di navigazione" className={className}>
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <svg
                  className="h-4 w-4 text-gray-400 mx-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}

              {isLast || !item.href ? (
                <span
                  className="text-gray-900 font-medium"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}