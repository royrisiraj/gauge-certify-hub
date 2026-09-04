import type { LucideIcon, ReactNode } from "lucide-react";
import type { ReactElement } from "react";

type Props = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: Props): ReactElement {
  return (
    <div className="surface-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      {Icon ? <Icon aria-hidden="true" className="size-8 text-muted-foreground" /> : null}
      <h2 className="text-h4 font-semibold">{title}</h2>
      <p className="max-w-md text-[15px] text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
