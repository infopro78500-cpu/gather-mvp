"use client";

import React from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-background hover:bg-primary/90 focus-visible:outline-primary/70",
  secondary:
    "bg-surface-strong text-foreground hover:bg-surface-strong/80 border border-border focus-visible:outline-primary/60",
  ghost:
    "bg-transparent text-foreground hover:bg-surface/70 border border-border/60 focus-visible:outline-primary/60",
  danger: "bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger/60",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className);
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClasses({ variant, size, className })}
        aria-busy={loading}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 rounded-full border-2 border-transparent border-t-foreground border-l-foreground animate-spin" aria-hidden />
        )}
        <span className="inline-flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
