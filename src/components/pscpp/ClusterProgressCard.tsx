import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StudyCluster } from "@/types/pscpp";

export function ClusterProgressCard({ cluster }: { cluster: StudyCluster }) {
  const critical = cluster.priority === "altíssima" && cluster.progress < 15;

  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold leading-tight">{cluster.name}</h3>
              {critical ? (
                <Badge variant="outline" className="border-destructive/40 text-destructive">
                  crítico
                </Badge>
              ) : (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {cluster.priority}
                </Badge>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{cluster.description}</p>
          </div>
          {critical ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{cluster.progress}%</span>
          </div>
          <Progress value={cluster.progress} className="h-1.5" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Stat label="Status" value={cluster.status} />
          <Stat label="Questões" value={String(cluster.questionsDone)} />
          <Stat label="Acerto" value={cluster.accuracy ? `${cluster.accuracy}%` : "—"} />
        </div>

        <div className="mt-4 rounded-md border border-border bg-card/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Próxima ação
          </div>
          <div className="mt-1 text-sm font-medium">{cluster.nextActions[0]}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-medium">{value}</div>
    </div>
  );
}
