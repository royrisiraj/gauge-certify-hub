import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type Crumb = { label: string; to?: string };

type Props = {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
};

export function PageHeader({ title, description, crumbs, actions }: Props) {
  return (
    <header className="mb-6">
      {crumbs && crumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {crumb.to ? (
                  <Link to={crumb.to} className="rounded hover:text-primary hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-foreground">
                    {crumb.label}
                  </span>
                )}
                {index < crumbs.length - 1 ? <ChevronRight aria-hidden="true" className="size-3.5" /> : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-h2 font-bold">{title}</h1>
          {description ? <p className="mt-1 text-[15px] text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
