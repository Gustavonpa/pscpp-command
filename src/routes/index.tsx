import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClusterProgressCard } from "@/components/pscpp/ClusterProgressCard";
import { MetricCard } from "@/components/pscpp/MetricCard";
import { NextActionCard } from "@/components/pscpp/NextActionCard";
import { nextObjectiveAction } from "@/data/pscppSeed";
import { usePscppData } from "@/hooks/usePscppData";
import { fmtDate, startOfWeek, endOfWeek } from "@/lib/week";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  FileQuestion,
  ListChecks,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard PSCPP — Command Center" },
      { name: "description", content: "Centro de comando dos estudos PSCPP." },
    ],
  }),
  component: Dashboard,
});

type Study = {
  date: string;
  duration_minutes: number;
  subject: string | null;
  questions: number | null;
  correct: number | null;
};

function Dashboard() {
  const { user, loading } = useAuthGate();
  const { clusters, materials, topics, loading: loadingPscppData, source } = usePscppData();
  const [studies, setStudies] = useState<Study[]>([]);

  const weekRange = useMemo(() => {
    const now = new Date();
    return { start: fmtDate(startOfWeek(now)), end: fmtDate(endOfWeek(now)) };
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("study_sessions")
        .select("date,duration_minutes,subject,questions,correct")
        .gte("date", weekRange.start)
        .lte("date", weekRange.end);
      setStudies((data ?? []) as Study[]);
    })();
  }, [user, weekRange.end, weekRange.start]);

  if (loading || !user || loadingPscppData) return null;

  const totalStudyMinutes = studies.reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0);
  const totalQuestions = studies.reduce((sum, item) => sum + (item.questions ?? 0), 0);
  const totalCorrect = studies.reduce((sum, item) => sum + (item.correct ?? 0), 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const overallProgress = Math.round(
    clusters.reduce((sum, cluster) => sum + cluster.progress, 0) / clusters.length,
  );
  const pendingMaterials = materials.filter((material) => material.status === "confirmar").length;
  const criticalCluster = [...clusters].sort((a, b) => {
    const priorityScore = Number(b.priority === "altíssima") - Number(a.priority === "altíssima");
    return priorityScore || a.progress - b.progress;
  })[0];
  const weakestCluster = [...clusters].sort((a, b) => a.progress - b.progress)[0];
  const priorityMaterials = materials
    .filter((material) => material.priority === "altíssima" || material.status === "confirmar")
    .slice(0, 6);
  const nextReviews = clusters.filter((cluster) => cluster.nextReview).slice(0, 3);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">
              Etapa 1
            </Badge>
            <Badge variant="outline">Organização</Badge>
            <Badge variant="outline">{source === "supabase" ? "Supabase" : "Dados locais"}</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard PSCPP</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Visão executiva para saber o que você tem, o que precisa estudar e qual é a próxima ação
            concreta.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/study">
              <BookOpen className="mr-1 h-4 w-4" /> Registrar estudo
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/plan">
              <ListChecks className="mr-1 h-4 w-4" /> Plano semanal
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Horas na semana"
          value={`${(totalStudyMinutes / 60).toFixed(1)}h`}
          hint={`${studies.length} blocos registrados`}
          icon={CalendarClock}
          tone={totalStudyMinutes >= 180 ? "success" : "warning"}
        />
        <MetricCard
          title="Progresso geral"
          value={`${overallProgress}%`}
          hint={`${clusters.length} clusters mapeados`}
          icon={Target}
        />
        <MetricCard
          title="Questões feitas"
          value={String(totalQuestions)}
          hint={totalQuestions ? `${accuracy}% de acerto` : "Banco será estruturado na Etapa 3"}
          icon={FileQuestion}
        />
        <MetricCard
          title="Materiais a confirmar"
          value={String(pendingMaterials)}
          hint="Abrir PDF e validar conteúdo"
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
        <NextActionCard action={nextObjectiveAction} />
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sinais de atenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Signal
              label="Matéria mais atrasada"
              value={weakestCluster.name}
              detail={`${weakestCluster.progress}% concluído`}
            />
            <Signal
              label="Matéria mais crítica"
              value={criticalCluster.name}
              detail={`${criticalCluster.priority} prioridade`}
            />
            <Signal
              label="Próxima revisão"
              value={nextReviews[0]?.name ?? "Sem revisão agendada"}
              detail={nextReviews[0]?.nextReview ?? "Definir após o primeiro bloco"}
            />
          </CardContent>
        </Card>
      </div>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Progresso por cluster</h2>
            <p className="text-sm text-muted-foreground">
              Os 7 blocos principais do edital ficam visíveis desde o início.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/mapa">Abrir mapa</Link>
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {clusters.map((cluster) => (
            <ClusterProgressCard key={cluster.id} cluster={cluster} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Biblioteca prioritária</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/biblioteca">Ver tudo</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priorityMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{material.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{material.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Conteúdo programático inicial</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/conteudo-programatico">Ver tópicos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topics.slice(0, 6).map((topic) => {
              const cluster = clusters.find((item) => item.id === topic.clusterId);
              return (
                <div key={topic.id} className="rounded-md border border-border bg-card/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{topic.name}</div>
                      <div className="text-xs text-muted-foreground">{cluster?.name}</div>
                    </div>
                    <Badge variant="outline">{topic.importance}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 border-success/30 bg-success/5 shadow-none">
        <CardContent className="flex items-start gap-3 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <div className="font-medium">Regra de proteção contra acumular PDFs</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Todo material com status “confirmar” precisa virar uma ação objetiva: abrir,
              identificar capítulos úteis e vincular a um tópico do conteúdo programático.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Signal({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium leading-snug">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
