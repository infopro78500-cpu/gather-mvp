import React from "react";
import { cn } from "@/lib/cn";

export type PageLayoutProps = {
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function PageLayout({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
}: PageLayoutProps) {
  return (
    <main className={cn("page-shell", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {(title || description || actions) && (
          <header className="space-y-3 rounded-2xl bg-surface/80 px-5 py-6 shadow-[0_12px_60px_rgba(0,0,0,0.25)] border border-border/60">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                {eyebrow && (
                  <p className="text-[11px] uppercase tracking-[0.25em] text-muted">{eyebrow}</p>
                )}
                {title && <h1 className="text-2xl md:text-3xl font-semibold leading-snug">{title}</h1>}
                {description && <p className="text-sm text-muted md:text-base max-w-3xl leading-relaxed">{description}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </header>
        )}

        {children}
      </div>
    </main>
  );
}
