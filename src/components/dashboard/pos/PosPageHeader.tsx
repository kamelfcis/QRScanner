interface PosPageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PosPageHeader({ eyebrow, title, description, action }: PosPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="font-heading text-muted-foreground text-xs uppercase tracking-[0.18em]">
          {eyebrow}
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold md:text-3xl">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
