import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] font-medium tracking-[-0.005em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-[color:var(--rose)] text-white hover:bg-[color:var(--rose)]/90',
        success: 'bg-[color:var(--emerald)] text-white hover:bg-[color:var(--emerald)]/90',
        outline:
          'border border-[color:var(--border-2)] bg-card text-foreground hover:bg-[color:var(--background-2)]',
        secondary:
          'border border-[color:var(--border-2)] bg-card text-foreground hover:bg-[color:var(--background-2)]',
        ghost: 'text-[color:var(--ink-2)] hover:bg-[color:var(--background-2)]',
        link: 'text-primary underline-offset-4 hover:underline',
        soft: 'bg-accent text-accent-foreground hover:bg-accent/80',
        softemer:
          'bg-[color:var(--emerald-soft)] text-[color:var(--emerald)] hover:bg-[color:var(--emerald-soft)]/80',
        softrose:
          'bg-[color:var(--rose-soft)] text-[color:var(--rose)] hover:bg-[color:var(--rose-soft)]/80',
      },
      size: {
        sm: 'h-[30px] px-2.5 text-[12.5px]',
        default: 'h-9 px-3.5 text-[13.5px]',
        lg: 'h-11 px-[18px] text-[14.5px]',
        xl: 'h-[52px] px-[22px] text-[15.5px] rounded-xl',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
