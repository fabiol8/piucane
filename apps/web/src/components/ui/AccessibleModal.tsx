'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useFocusManager } from '@/lib/accessibility/focus-management';
import { ScreenReaderOnly } from './ScreenReaderOnly';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  role?: 'dialog' | 'alertdialog';
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export function AccessibleModal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  role = 'dialog',
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  const { containerRef, focusFirstElement, restoreFocus } = useFocusManager(
    isOpen,
    {
      trapFocus: true,
      autoFocus: true,
      restoreOnUnmount: true,
    }
  );

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle custom escape event from focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleCustomEscape = () => {
      if (closeOnEscape) {
        onClose();
      }
    };

    const modal = modalRef.current;
    if (modal) {
      modal.addEventListener('escape-key', handleCustomEscape);
      return () => modal.removeEventListener('escape-key', handleCustomEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Announce modal opening to screen readers
  useEffect(() => {
    if (isOpen && title) {
      const announcement = `Modal aperto: ${title}`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'assertive');
      ariaLive.setAttribute('aria-atomic', 'true');
      ariaLive.className = 'sr-only';
      ariaLive.textContent = announcement;

      document.body.appendChild(ariaLive);
      setTimeout(() => {
        if (document.body.contains(ariaLive)) {
          document.body.removeChild(ariaLive);
        }
      }, 1000);
    }
  }, [isOpen, title]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={(node) => {
            modalRef.current = node;
            if (containerRef) {
              (containerRef as React.MutableRefObject<HTMLDivElement>).current = node;
            }
          }}
          role={role}
          aria-modal="true"
          aria-labelledby={ariaLabelledBy || (title ? titleId : undefined)}
          aria-describedby={ariaDescribedBy || (description ? descriptionId : undefined)}
          className={cn(
            'relative w-full transform overflow-hidden rounded-lg bg-white shadow-xl transition-all',
            sizeClasses[size],
            className
          )}
        >
          {/* Close button */}
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
              aria-label="Chiudi modal"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>

          {/* Modal content */}
          <div className="p-6">
            {title && (
              <h2
                id={titleId}
                className="text-lg font-semibold text-gray-900 mb-4 pr-8"
              >
                {title}
              </h2>
            )}

            {description && (
              <p
                id={descriptionId}
                className="text-sm text-gray-600 mb-6"
              >
                {description}
              </p>
            )}

            <div className="space-y-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}

// Confirmation Modal with accessibility enhancements
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'info',
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantStyles = {
    danger: {
      icon: (
        <svg
          className="h-6 w-6 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L5.35 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      ),
      buttonVariant: 'destructive' as const,
    },
    warning: {
      icon: (
        <svg
          className="h-6 w-6 text-orange-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      buttonVariant: 'warning' as const,
    },
    info: {
      icon: (
        <svg
          className="h-6 w-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      buttonVariant: 'primary' as const,
    },
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      role="alertdialog"
      size="sm"
      closeOnBackdropClick={false}
      title={title}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {variantStyles[variant].icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-6">
            {message}
          </p>
          <div className="flex space-x-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              size="sm"
            >
              {cancelText}
            </Button>
            <Button
              variant={variantStyles[variant].buttonVariant}
              onClick={handleConfirm}
              size="sm"
              autoFocus
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>

      <ScreenReaderOnly>
        <div role="alert">
          Modal di conferma aperto. {message}
        </div>
      </ScreenReaderOnly>
    </AccessibleModal>
  );
}