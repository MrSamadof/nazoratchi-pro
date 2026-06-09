'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Modal = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalPortal = DialogPrimitive.Portal;

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
ModalOverlay.displayName = 'ModalOverlay';

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    icon?: React.ReactNode;
    iconTone?: 'accent' | 'emerald' | 'rose' | 'amber';
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    footer?: React.ReactNode;
    width?: number;
  }
>(({ className, children, icon, iconTone = 'accent', title, subtitle, footer, width = 460, ...props }, ref) => {
  const iconBg = {
    accent: 'bg-accent text-accent-foreground',
    emerald: 'bg-[color:var(--emerald-soft)] text-[color:var(--emerald)]',
    rose: 'bg-[color:var(--rose-soft)] text-[color:var(--rose)]',
    amber: 'bg-[color:var(--amber-soft)] text-[color:var(--amber-ink)]',
  }[iconTone];

  return (
    <ModalPortal>
      <ModalOverlay />
      <DialogPrimitive.Content
        ref={ref}
        style={{ width: `min(${width}px, calc(100vw - 32px))` }}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'bg-card rounded-[16px] overflow-hidden',
          'shadow-[0_24px_64px_-12px_rgba(0,0,0,.4),_0_0_0_1px_rgba(0,0,0,.05)]',
          'max-h-[90vh] flex flex-col',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      >
        <div className="flex items-start gap-3.5 p-5 pb-0">
          {icon && (
            <span
              className={cn(
                'inline-grid place-items-center size-9 rounded-[10px] shrink-0 [&_svg]:size-4',
                iconBg,
              )}
            >
              {icon}
            </span>
          )}
          <div className="flex-1 min-w-0 leading-tight space-y-1">
            {title && <DialogPrimitive.Title className="text-[16px] font-semibold tracking-[-0.015em]">{title}</DialogPrimitive.Title>}
            {subtitle && (
              <DialogPrimitive.Description className="text-[12.5px] text-[color:var(--ink-3)] leading-[1.5]">
                {subtitle}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="size-7 grid place-items-center rounded-[8px] text-[color:var(--ink-3)] hover:bg-[color:var(--background-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-3.5" />
            <span className="sr-only">Yopish</span>
          </DialogPrimitive.Close>
        </div>
        <div className="px-5 pt-4 pb-1 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 mt-3.5 border-t bg-[color:var(--background-2)]">{footer}</div>
        )}
      </DialogPrimitive.Content>
    </ModalPortal>
  );
});
ModalContent.displayName = 'ModalContent';

export { Modal, ModalTrigger, ModalContent };
