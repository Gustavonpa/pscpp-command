import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { NextObjectiveAction } from "@/types/pscpp";

export function NextActionCard({ action }: { action: NextObjectiveAction }) {
  return (
    <Card className="border-primary/40 bg-primary/5 shadow-none">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-primary/30 bg-primary/10 p-2">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Próxima ação objetiva
            </div>
            <div className="mt-1 text-lg font-semibold leading-snug">
              Estudar {action.duration} de {action.cluster}.
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <Info label="Tópico" value={action.topic} />
              <Info label="Material" value={action.material} />
              <Info label="Tarefa" value={action.task} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium leading-snug">{value}</div>
    </div>
  );
}
