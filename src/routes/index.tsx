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
import { parseDurationToHours } from "@/lib/garmin";
import { classifyTraining, paceToSeconds, secondsToPace } from "@/lib/garmin-training";

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
type GarminSleep = {
  date: string;
  sleep_score: number | null;
  resting_heart_rate: number | null;
  body_battery: number | null;
  hrv_status: string | null;
  sleep_duration: string | null;
};
type GarminTraining = {
  activity_date: string;
  activity_type: string | null;
  duration_minutes: number | null;
  distance_km: number | null;
  average_pace: string | null;
  average_heart_rate: number | null;
  calories: number | null;
};

function Dashboard() {
  const { user, loading } = useAuthGate();
  const [weekRef, setWeekRef] = useState<Date>(new Date());
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [garmin, setGarmin] = useState<GarminSleep[]>([]);
  const [garminPrev, setGarminPrev] = useState<GarminSleep[]>([]);
  const [gTrainings, setGTrainings] = useState<GarminTraining[]>([]);

  const start = useMemo(() => startOfWeek(weekRef), [weekRef]);
  const end = useMemo(() => endOfWeek(weekRef), [weekRef]);
  const prevStart = useMemo(() => addDays(start, -7), [start]);
  const prevEnd = useMemo(() => addDays(end, -7), [end]);

  useEffect(() => {
    if (!user) return;
    const s = fmtDate(start);
    const e = fmtDate(end);
    const ps = fmtDate(prevStart);
    const pe = fmtDate(prevEnd);
    const garminCols = "date,sleep_score,resting_heart_rate,body_battery,hrv_status,sleep_duration";
    const trCols = "activity_date,activity_type,duration_minutes,distance_km,average_pace,average_heart_rate,calories";
    (async () => {
      const [c, st, tr, g, gp, gt] = await Promise.all([
        supabase.from("daily_checkins").select("*").gte("date", s).lte("date", e),
        supabase.from("study_sessions").select("date,duration_minutes").gte("date", s).lte("date", e),
        supabase.from("training_sessions").select("date,is_long_run").gte("date", s).lte("date", e),
        supabase.from("garmin_sleep_metrics").select(garminCols).gte("date", s).lte("date", e),
        supabase.from("garmin_sleep_metrics").select(garminCols).gte("date", ps).lte("date", pe),
        supabase.from("garmin_training_sessions").select(trCols).gte("activity_date", s).lte("activity_date", e),
      ]);
      setCheckins((c.data ?? []) as Checkin[]);
      setStudies((st.data ?? []) as Study[]);
      setTrainings((tr.data ?? []) as Training[]);
      setGarmin((g.data ?? []) as GarminSleep[]);
      setGarminPrev((gp.data ?? []) as GarminSleep[]);
      setGTrainings((gt.data ?? []) as GarminTraining[]);
    })();
  }, [user, start, end, prevStart, prevEnd]);

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

  const effectiveTrainings = Math.max(trainingsCount, gTrainings.length);
  const score =
    (studyBlocks >= 5 ? 2 : studyBlocks >= 3 ? 1 : 0) +
    (effectiveTrainings >= 3 ? 2 : effectiveTrainings >= 1 ? 1 : 0) +
    (wakeOnTime >= 5 ? 2 : wakeOnTime >= 3 ? 1 : 0) +
    (avgSleep >= 7 ? 2 : avgSleep >= 6.5 ? 1 : 0);
  const status =
    score >= 7 ? { label: "Vencida", tone: "success" as const } :
    score >= 4 ? { label: "Aceitável", tone: "warning" as const } :
                 { label: "Crítica", tone: "destructive" as const };

  // Garmin-derived aggregates
  const garminDur = garmin.map((g) => parseDurationToHours(g.sleep_duration)).filter((v): v is number => v !== null);
  const garminAvgSleep = garminDur.length ? garminDur.reduce((a, b) => a + b, 0) / garminDur.length : 0;
  const scoreVals = garmin.map((g) => g.sleep_score).filter((v): v is number => v !== null);
  const avgScore = scoreVals.length ? scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length : 0;
  const rhrVals = garmin.map((g) => g.resting_heart_rate).filter((v): v is number => v !== null);
  const avgRhr = rhrVals.length ? rhrVals.reduce((a, b) => a + b, 0) / rhrVals.length : 0;
  const bbVals = garmin.map((g) => g.body_battery).filter((v): v is number => v !== null);
  const avgBb = bbVals.length ? bbVals.reduce((a, b) => a + b, 0) / bbVals.length : 0;
  const shortNights = garminDur.filter((h) => h < 6.5).length;
  const bestNight = garmin.reduce<GarminSleep | null>((acc, g) => (g.sleep_score && (!acc || (acc.sleep_score ?? 0) < g.sleep_score) ? g : acc), null);
  const worstNight = garmin.reduce<GarminSleep | null>((acc, g) => (g.sleep_score && (!acc || (acc.sleep_score ?? 999) > g.sleep_score) ? g : acc), null);
  const hrvCounts = garmin.reduce<Record<string, number>>((acc, g) => { if (g.hrv_status) acc[g.hrv_status] = (acc[g.hrv_status] ?? 0) + 1; return acc; }, {});
  const hrvDominant = Object.entries(hrvCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const prevRhrVals = garminPrev.map((g) => g.resting_heart_rate).filter((v): v is number => v !== null);
  const prevAvgRhr = prevRhrVals.length ? prevRhrVals.reduce((a, b) => a + b, 0) / prevRhrVals.length : 0;

  // Garmin training aggregates
  const trWithCat = gTrainings.map((t) => ({ ...t, cat: classifyTraining(t.activity_type) }));
  const gTrCount = trWithCat.length;
  const runs = trWithCat.filter((t) => t.cat === "corrida");
  const strength = trWithCat.filter((t) => t.cat === "fortalecimento");
  const walks = trWithCat.filter((t) => t.cat === "caminhada");
  const totalDistKm = runs.reduce((a, t) => a + (t.distance_km ?? 0), 0);
  const totalTrainMin = trWithCat.reduce((a, t) => a + (t.duration_minutes ?? 0), 0);
  const totalCalories = trWithCat.reduce((a, t) => a + (t.calories ?? 0), 0);
  const longRun = runs.reduce<typeof runs[number] | null>((acc, r) => ((r.distance_km ?? 0) > (acc?.distance_km ?? 0) ? r : acc), null);
  const runHr = runs.map((r) => r.average_heart_rate).filter((v): v is number => v !== null);
  const avgRunHr = runHr.length ? runHr.reduce((a, b) => a + b, 0) / runHr.length : 0;
  const runPaces = runs.map((r) => paceToSeconds(r.average_pace)).filter((v): v is number => v !== null);
  const avgRunPaceSec = runPaces.length ? runPaces.reduce((a, b) => a + b, 0) / runPaces.length : 0;

  // Cross sleep+training: intense training after low-sleep night
  const intenseAfterPoorSleep = trWithCat.some((t) => {
    if ((t.duration_minutes ?? 0) < 40) return false;
    const prevDay = fmtDate(addDays(new Date(t.activity_date), -1));
    const sl = garmin.find((g) => g.date === prevDay);
    const slHours = sl ? parseDurationToHours(sl.sleep_duration) : null;
    return (slHours !== null && slHours < 6.5) || (sl?.sleep_score !== null && sl?.sleep_score !== undefined && sl.sleep_score < 65);
  });

  const alerts: string[] = [];
  if (studyBlocks < 3) alerts.push("Atenção à consistência: menos de 3 blocos de estudo na semana.");
  if (sleepValues.length > 0 && avgSleep < 6.5) alerts.push("Sono prejudicando performance: média abaixo de 6h30.");
  if (phoneAbuse > 2) alerts.push("Manhã sendo sequestrada: celular antes do primeiro bloco em mais de 2 dias.");
  if (gTrCount === 0) alerts.push("Corpo fora do plano: nenhum treino registrado.");
  else if (gTrCount < 3) alerts.push("Volume de treino abaixo do plano: menos de 3 treinos na semana.");
  if (gTrCount > 0 && runs.length === 0) alerts.push("Nenhuma corrida registrada. Atenção à preparação para a meia.");
  if (gTrCount > 0 && strength.length === 0) alerts.push("Fortalecimento ausente. Risco maior de lesão.");
  if (runs.length > 0 && totalDistKm < 15) alerts.push("Quilometragem semanal baixa para evolução na meia.");
  if (longRun && (longRun.distance_km ?? 0) < 8) alerts.push("Longão ainda abaixo do planejado para a meia.");
  if (intenseAfterPoorSleep) alerts.push("Treino realizado com sono baixo. Atenção à recuperação.");
  if (avgScore > 0 && avgScore < 70) alerts.push("Seu sono está abaixo do ideal para sustentar estudo, treino e O2con.");
  if (shortNights >= 2) alerts.push("Você teve noites curtas demais. Isso pode prejudicar sua consistência no PSCPP.");
  if (prevAvgRhr > 0 && avgRhr > prevAvgRhr) alerts.push("FC de repouso subiu vs. semana anterior: possível sinal de fadiga.");
  if (avgBb > 0 && avgBb < 70 && bbVals.length > 0) alerts.push("Body Battery médio baixo: atenção à recuperação antes de aumentar carga.");

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

      {garmin.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Metric label="Sono médio (Garmin)" value={garminAvgSleep ? `${garminAvgSleep.toFixed(1)}h` : "—"} />
          <Metric label="Score do sono" value={avgScore ? avgScore.toFixed(0) : "—"} hint={avgScore >= 80 ? "ótimo" : avgScore >= 70 ? "ok" : "baixo"} />
          <Metric label="FC repouso" value={avgRhr ? avgRhr.toFixed(0) : "—"} hint="bpm" />
          <Metric label="Body Battery" value={avgBb ? avgBb.toFixed(0) : "—"} />
          <Metric label="Noites < 6h30" value={`${shortNights}/${garminDur.length || 7}`} tone={shortNights >= 2 ? "muted" : undefined} />
          <Metric label="Melhor noite" value={bestNight?.sleep_score ? `${bestNight.sleep_score}` : "—"} hint={bestNight?.date.slice(5) ?? ""} tone="success" />
          <Metric label="Pior noite" value={worstNight?.sleep_score ? `${worstNight.sleep_score}` : "—"} hint={worstNight?.date.slice(5) ?? ""} tone="muted" />
          <Metric label="VFC predominante" value={hrvDominant} />
        </div>
      )}

      {gTrCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Metric label="Treinos (Garmin)" value={gTrCount} progress={(gTrCount / 4) * 100} />
          <Metric label="Corridas" value={runs.length} progress={(runs.length / 3) * 100} />
          <Metric label="Fortalecimentos" value={strength.length} progress={(strength.length / 2) * 100} />
          <Metric label="Caminhadas" value={walks.length} />
          <Metric label="Distância corrida" value={`${totalDistKm.toFixed(2)} km`} />
          <Metric label="Tempo total treino" value={`${(totalTrainMin / 60).toFixed(1)}h`} hint={`${Math.round(totalTrainMin)} min`} />
          <Metric
            label="Longão"
            value={longRun?.distance_km ? `${longRun.distance_km.toFixed(2)} km` : "Pendente"}
            hint={`Total semana: ${totalDistKm.toFixed(2)} km`}
            tone={longRun?.distance_km && longRun.distance_km >= 8 ? "success" : "muted"}
          />
          <Metric label="Maior corrida" value={longRun?.distance_km ? `${longRun.distance_km.toFixed(2)} km` : "—"} />
          <Metric label="Pace médio" value={avgRunPaceSec ? secondsToPace(avgRunPaceSec) : "—"} />
          <Metric label="FC média (corrida)" value={avgRunHr ? avgRunHr.toFixed(0) : "—"} hint="bpm" />
          <Metric label="Calorias treino" value={totalCalories ? `${Math.round(totalCalories)}` : "—"} />
          <Metric label="Treinos manuais" value={trainingsCount} hint="registro próprio" />
        </div>
      )}

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
