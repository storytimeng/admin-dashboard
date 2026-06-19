import type { ReactNode } from "react";

export function HtmlContentBlock({
  html,
  label,
}: {
  html?: string | null;
  label: string;
}) {
  if (!html?.trim()) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No {label} provided.
      </p>
    );
  }

  return (
    <div
      className="admin-rich-text rounded-lg border bg-card p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MetaItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{value}</div>
    </div>
  );
}
