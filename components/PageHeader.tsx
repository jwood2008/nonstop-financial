import type { ReactNode } from "react";

/**
 * Page header in the brand's layout idiom: a small uppercase crosshead label,
 * a bold display title, and a full-width hairline rule beneath — the same
 * structure the brand guide uses for its section titles. `actions` sit on the
 * right (filters, range pickers, etc.).
 */
export function PageHeader({
  label,
  title,
  meta,
  actions,
}: {
  label?: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-line pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {label && (
            <div className="crosshead text-[11px] text-muted-2">{label}</div>
          )}
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            {title}
          </h1>
          {meta && <div className="mt-1 text-sm text-muted">{meta}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
