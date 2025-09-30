import { forwardRef } from 'react';

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  [key: string]: any;
}

export const ScreenReaderOnly = forwardRef<HTMLElement, ScreenReaderOnlyProps>(
  ({ children, as: Component = 'span', className = '', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={`sr-only ${className}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

ScreenReaderOnly.displayName = 'ScreenReaderOnly';

// Component for announcements to screen readers
export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'text',
  className = '',
}: {
  children: React.ReactNode;
  politeness?: 'off' | 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
}) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={`sr-only ${className}`}
    >
      {children}
    </div>
  );
}

// Component for status messages
export function StatusMessage({
  children,
  type = 'status',
  className = '',
}: {
  children: React.ReactNode;
  type?: 'status' | 'alert' | 'log';
  className?: string;
}) {
  const roleMap = {
    status: 'status',
    alert: 'alert',
    log: 'log',
  };

  return (
    <div
      role={roleMap[type]}
      aria-live={type === 'alert' ? 'assertive' : 'polite'}
      className={`sr-only ${className}`}
    >
      {children}
    </div>
  );
}