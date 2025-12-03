import React from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";

export type SectionProps = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: SectionProps) {
  return (
    <Card className={cn("p-5 md:p-6", className)}>
      {(title || description || actions) && (
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {title && <h2 className="text-lg md:text-xl font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted leading-relaxed">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="space-y-3 md:space-y-4">{children}</div>
    </Card>
  );
}
