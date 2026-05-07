import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight, Plus, BookOpen, AlertTriangle, ClipboardCheck } from "lucide-react";
import { startOfWeek, endOfWeek, fmtDate, fmtWeekLabel, addDays } from "@/lib/week";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — PSCPP Command Center" },
      { name: "description", content: "Painel semanal: estudos, treinos, sono e rotina." },
    ],
  }),
  component: Dashboard,
});

type Checkin = {
  date: string;
  wake_time: string | null;
  sleep_hours: number | null;
  energy: number | null;
  mood: number | null;
  did_training: boolean;
  did_study: boolean;
  phone_before_block: boolean;
  meal_ready: boolean;
};
type Study = { date: string; duration_minutes: number };
type Training = { date: string; is_long_run: boolean };

function Dashboard() {
  const { user, loading } = useAuthGate();
  const [weekRef, setWeekRef] = useState<Date>(new Date());
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);

  const start = useMemo(() => startOfWeek(weekRef), [weekRef]);
  const end = useMemo(() => endOfWeek(weekRef), [weekRef]);

  useEffect(() => {
    if (!user) return;
    const s = fmtDate(start);
    const e = fmtDate(end);
    (async () => {
      const [c, st, tr] = await Promise.all([
        supabase.from("daily_checkins").select("*").gte("date", s).lte("date", e),
        supabase.from("study_sessions").select("date,duration_minutes").gte("date", s).lte("date", e),
        supabase.from("training_sessions").select("date,is_long_run").gte("date", s).lte("date", e),
      ]);
      setCheckins((c.data ?? []) as Checkin[]);
      setStudies((st.data ?? []) as Study[]);
      setTrainings((tr.data ?? []) as Training[]);
    })();
  }, [user, start, end]);

  if (loading || !user) return null;

  const totalStudyMin = studies.reduce((a, b) => a + (b.duration_minutes ?? 0), 0);
  const studyBlocks = studies.length;
  const wakeOnTime = checkins.filter((c) => c.wake_time && c.wake_time <= "06:30:00").length;
  const trainingsCount = trainings.length;
  const longRunDone = trainings.some((t) => t.is_long_run);
  const sleepValues = checkins.map((c) => Number(c.sleep_hours)).filter((v) => v > 0);
  const avgSleep = sleepValues.length ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length : 0;
  const meals = checkins.filter((c) => c.meal_ready).length;
  const moodVals = checkins.map((c) => c.mood ?? 0).filter((v) => v > 0);
  const avgMood = moodVals.length ? moodVals.reduce((a, b) => a + b, 0) / moodVals.length : 0;
  const phoneAbuse = checkins.filter((c) => c.phone_before_block).length;

  const score =
    (studyBlocks >= 5 ? 2 : studyBlocks >= 3 ? 1 : 0) +
    (trainingsCount >= 3 ? 2 : trainingsCount >= 1 ? 1 : 0) +
    (wakeOnTime >= 5 ? 2 : wakeOnTime >= 3 ? 1 : 0) +
    (avgSleep >= 7 ? 2 : avgSleep >= 6.5 ? 1 : 0);
  const status =
    score >= 7 ? { label: "Vencida", tone: "success" as const } :
    score >= 4 ? { label: "Aceitável", tone: "warning" as const } :
                 { label: "Crítica", tone: "destructive" as const };

  const alerts: string[] = [];
  if (studyBlocks < 3) alerts.push("Atenção à consistência: menos de 3 blocos de estudo na semana.");
  if (sleepValues.length > 0 && avgSleep < 6.5) alerts.push("Sono prejudicando performance: média abaixo de 6h30.");
  if (phoneAbuse > 2) alerts.push("Manhã sendo sequestrada: celular antes do primeiro bloco em mais de 2 dias.");
  if (trainingsCount === 0) alerts.push("Corpo fora do plano: nenhum treino registrado.");

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Semana</h1>
          <p className="text-sm text-muted-foreground">{fmtWeekLabel(weekRef)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekRef(addDays(weekRef, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekRef(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekRef(addDays(weekRef, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <Button asChild className="flex-1 sm:flex-none">
          <Link to="/checkin"><ClipboardCheck className="h-4 w-4 mr-1" /> Registrar dia</Link>
        </Button>
        <Button asChild variant="secondary" className="flex-1 sm:flex-none">
          <Link to="/study"><BookOpen className="h-4 w-4 mr-1" /> Registrar estudo</Link>
        </Button>
        <Button asChild variant="outline" size="icon" className="ml-auto">
          <Link to="/review"><Plus className="h-4 w-4" /></Link>
        </Button>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2 mb-5">
          {alerts.map((a) => (
            <Alert key={a} className="border-warning/40 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">{a}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Metric label="Horas PSCPP" value={`${(totalStudyMin / 60).toFixed(1)}h`} hint={`${totalStudyMin} min`} />
        <Metric label="Blocos de estudo" value={studyBlocks} progress={(studyBlocks / 5) * 100} />
        <Metric label="Acordou ≤ 6h30" value={`${wakeOnTime}/7`} progress={(wakeOnTime / 7) * 100} />
        <Metric label="Treinos" value={trainingsCount} progress={(trainingsCount / 4) * 100} />
        <Metric label="Longão" value={longRunDone ? "Feito" : "Pendente"} tone={longRunDone ? "success" : "muted"} />
        <Metric label="Sono médio" value={`${avgSleep.toFixed(1)}h`} hint={avgSleep >= 7 ? "ok" : avgSleep >= 6.5 ? "limítrofe" : "baixo"} />
        <Metric label="Marmitas/jantas" value={`${meals}/7`} progress={(meals / 7) * 100} />
        <Metric label="Nota emocional" value={avgMood ? avgMood.toFixed(1) : "—"} hint="0–10" />
      </div>

      <Card className="mb-5">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Status da semana</CardTitle>
          <Badge
            className={
              status.tone === "success" ? "bg-success/15 text-success border-success/30" :
              status.tone === "warning" ? "bg-warning/15 text-warning border-warning/30" :
              "bg-destructive/15 text-destructive border-destructive/30"
            }
            variant="outline"
          >
            {status.label}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const ds = fmtDate(d);
              const c = checkins.find((x) => x.date === ds);
              const studied = studies.some((x) => x.date === ds);
              const trained = trainings.some((x) => x.date === ds);
              return (
                <div key={ds} className="rounded-md border border-border p-2 text-center bg-card/40">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                  </div>
                  <div className="text-sm font-medium mb-1">{d.getDate()}</div>
                  <div className="flex justify-center gap-1">
                    <Dot active={!!c} title="check-in" color="bg-chart-3" />
                    <Dot active={studied} title="estudo" color="bg-primary" />
                    <Dot active={trained} title="treino" color="bg-success" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Dot({ active, color, title }: { active: boolean; color: string; title: string }) {
  return <span title={title} className={`inline-block h-1.5 w-1.5 rounded-full ${active ? color : "bg-muted"}`} />;
}

function Metric({
  label, value, hint, progress, tone,
}: { label: string; value: string | number; hint?: string; progress?: number; tone?: "success" | "muted" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold mt-1 ${tone === "success" ? "text-success" : tone === "muted" ? "text-muted-foreground" : ""}`}>
          {value}
        </div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
        {progress !== undefined && <Progress value={Math.min(100, progress)} className="h-1 mt-2" />}
      </CardContent>
    </Card>
  );
}
