import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = 'button', disabled, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
        'bg-accent-green text-bg-base hover:bg-accent-green/90',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-green',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export const ButtonSecondary = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-lg border border-bg-border bg-bg-card px-4 py-2.5 text-sm font-semibold text-fg-primary transition-colors',
      'hover:border-fg-muted/40 hover:bg-bg-elev',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-green',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
ButtonSecondary.displayName = 'ButtonSecondary';
