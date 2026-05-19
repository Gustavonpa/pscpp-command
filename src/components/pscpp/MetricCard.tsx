import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "default" | "success" | "warning" | "danger";

const toneClass: Record<MetricTone, string> = {
  default: "border-border bg-card/60",
  success: "border-success/40 bg-success/5",
  warning: "border-warning/40 bg-warning/5",
  danger: "border-destructive/40 bg-destructive/5",
};

export function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: MetricTone;
}) {
  return (
    <Card className={cn("shadow-none", toneClass[tone])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {title}
            </div>
            <div className="mt-1 text-2xl font-semibold leading-tight">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          <Icon className="h-5 w-5 shrink-0 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
