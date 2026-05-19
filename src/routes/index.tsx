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
import {
  ChevronLeft, ChevronRight, Plus, BookOpen, AlertTriangle, ClipboardCheck,
  CheckCircle2, AlertCircle, Flame, Target, ListChecks,
} from "lucide-react";
import { startOfWeek, endOfWeek, fmtDate, fmtWeekLabel, addDays } from "@/lib/week";
import { parseDurationToHours } from "@/lib/garmin";
import { classifyTraining, paceToSeconds, secondsToPace, formatDisplayDistance } from "@/lib/garmin-training";
import { MEIA_POA_DATE, weeksUntil, PILOTO_GOALS, weekStage } from "@/lib/plan-template";

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
  date: string; wake_time: string | null; sleep_hours: number | null;
  energy: number | null; mood: number | null; did_training: boolean;
  did_study: boolean; phone_before_block: boolean; meal_ready: boolean;
};
type Study = { date: string; duration_minutes: number; subject: string | null; specific_content: string | null; mastery_level: number | null };
type Training = { date: string; is_long_run: boolean };
type GarminSleep = {
  date: string; sleep_score: number | null; resting_heart_rate: number | null;
  body_battery: number | null; hrv_status: string | null; sleep_duration: string | null;
};
type GarminTraining = {
  activity_date: string; activity_type: string | null; activity_name: string | null;
  duration_minutes: number | null; distance_km: number | null;
  average_pace: string | null; average_heart_rate: number | null; calories: number | null;
};

const STUDY_BLOCKS_TARGET = PILOTO_GOALS.studyBlocks;
const TRAININGS_TARGET = PILOTO_GOALS.trainingsTotal;
const RUN_KM_TARGET = 20;
const LONGRUN_TARGET = 8;
const SLEEP_TARGET = 7;
const SLEEP_MIN = 6.5;

function Dashboard() {
  const { user, loading } = useAuthGate();
  const [weekRef, setWeekRef] = useState<Date>(new Date());
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [garmin, setGarmin] = useState<GarminSleep[]>([]);
  const [gTrainings, setGTrainings] = useState<GarminTraining[]>([]);
  const [weakStudies, setWeakStudies] = useState<Study[]>([]);

  const start = useMemo(() => startOfWeek(weekRef), [weekRef]);
  const end = useMemo(() => endOfWeek(weekRef), [weekRef]);

  useEffect(() => {
    if (!user) return;
    const s = fmtDate(start);
    const e = fmtDate(end);
    const trCols = "activity_date,activity_type,activity_name,duration_minutes,distance_km,average_pace,average_heart_rate,calories";
    const studyCols = "date,duration_minutes,subject,specific_content,mastery_level";
    (async () => {
      const [c, st, tr, g, gt, wk] = await Promise.all([
        supabase.from("daily_checkins").select("*").gte("date", s).lte("date", e),
        supabase.from("study_sessions").select(studyCols).gte("date", s).lte("date", e),
        supabase.from("training_sessions").select("date,is_long_run").gte("date", s).lte("date", e),
        supabase.from("garmin_sleep_metrics").select("date,sleep_score,resting_heart_rate,body_battery,hrv_status,sleep_duration").gte("date", s).lte("date", e),
        supabase.from("garmin_training_sessions").select(trCols).gte("activity_date", s).lte("activity_date", e),
        supabase.from("study_sessions").select(studyCols).lte("mastery_level", 2).order("date", { ascending: false }).limit(50),
      ]);
      setCheckins((c.data ?? []) as Checkin[]);
      setStudies((st.data ?? []) as Study[]);
      setTrainings((tr.data ?? []) as Training[]);
      setGarmin((g.data ?? []) as GarminSleep[]);
      setGTrainings((gt.data ?? []) as GarminTraining[]);
      setWeakStudies((wk.data ?? []) as Study[]);
    })();
  }, [user, start, end]);

  if (loading || !user) return null;

  // Aggregates
  const totalStudyMin = studies.reduce((a, b) => a + (b.duration_minutes ?? 0), 0);
  const studyBlocks = studies.length;
  const wakeOnTime = checkins.filter((c) => c.wake_time && c.wake_time <= "06:30:00").length;
  const phoneAbuse = checkins.filter((c) => c.phone_before_block).length;
  const meals = checkins.filter((c) => c.meal_ready).length;
  const sleepValues = checkins.map((c) => Number(c.sleep_hours)).filter((v) => v > 0);
  const avgSleepCk = sleepValues.length ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length : 0;
  const garminDur = garmin.map((g) => parseDurationToHours(g.sleep_duration)).filter((v): v is number => v !== null);
  const garminAvgSleep = garminDur.length ? garminDur.reduce((a, b) => a + b, 0) / garminDur.length : 0;
  const avgSleep = garminAvgSleep || avgSleepCk;
  const avgScore = (() => {
    const v = garmin.map((g) => g.sleep_score).filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  })();
  const avgBb = (() => {
    const v = garmin.map((g) => g.body_battery).filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  })();

  // Trainings
  const trWithCat = gTrainings.map((t) => ({ ...t, cat: classifyTraining(t.activity_type) }));
  const runs = trWithCat.filter((t) => t.cat === "corrida");
  const strength = trWithCat.filter((t) => t.cat === "fortalecimento");
  const totalDistKm = runs.reduce((a, t) => a + (t.distance_km ?? 0), 0);
  const longRun = runs.reduce<typeof runs[number] | null>(
    (acc, r) => ((r.distance_km ?? 0) > (acc?.distance_km ?? 0) ? r : acc), null,
  );
  const trainingsCount = Math.max(trainings.length, trWithCat.length);
  const runHr = runs.map((r) => r.average_heart_rate).filter((v): v is number => v !== null);
  const avgRunHr = runHr.length ? runHr.reduce((a, b) => a + b, 0) / runHr.length : 0;
  const runPaces = runs.map((r) => paceToSeconds(r.average_pace)).filter((v): v is number => v !== null);
  const avgRunPaceSec = runPaces.length ? runPaces.reduce((a, b) => a + b, 0) / runPaces.length : 0;

  // Days without study (consecutive recent)
  const today = new Date();
  let daysWithoutStudy = 0;
  for (let i = 0; i < 7; i++) {
    const d = fmtDate(addDays(today, -i));
    if (studies.some((s) => s.date === d)) break;
    daysWithoutStudy++;
  }
  // Tem algum estudo registrado em qualquer momento? (não punir histórico zero como “3 dias sem estudar”)
  const everStudied = studies.length > 0;

  // Estágio da semana (não punitivo no início)
  const stage = weekStage();

  // Score per pillar
  const pscppScore = studyBlocks >= STUDY_BLOCKS_TARGET ? 2 : studyBlocks >= 3 ? 1 : 0;
  const corpoScore =
    (trainingsCount >= 3 ? 1 : 0) +
    (avgSleep >= SLEEP_TARGET ? 1 : avgSleep >= SLEEP_MIN ? 0.5 : 0);
  const rotinaScore =
    (wakeOnTime >= PILOTO_GOALS.wakeOnTime ? 1 : wakeOnTime >= 2 ? 0.5 : 0) +
    (phoneAbuse <= 2 ? 1 : 0) +
    (meals >= PILOTO_GOALS.meals ? 1 : meals >= 2 ? 0.5 : 0);

  const overallScore = pscppScore + corpoScore + rotinaScore;
  const noActivity = studyBlocks === 0 && trainingsCount === 0 && checkins.length === 0;

  // Status geral por estágio da semana
  const overall: { label: string; tone: "success" | "warning" | "destructive" | "muted"; desc: string } = (() => {
    if (stage === "inicio" && noActivity) {
      return { label: "Semana iniciando", tone: "muted", desc: "Execute a primeira ação." };
    }
    if (stage === "meio") {
      if (studyBlocks < 2 || trainingsCount === 0) {
        return { label: "Atenção", tone: "warning", desc: "Ajustar hoje." };
      }
    }
    if (stage === "fim") {
      if (studyBlocks < 3 || trainingsCount < 2) {
        return { label: "Crítico", tone: "destructive", desc: "Retomar com mínimo diário." };
      }
    }
    if (overallScore >= 5.5) return { label: "No plano", tone: "success", desc: "Manter execução." };
    if (overallScore >= 3) return { label: "Atenção", tone: "warning", desc: "Ajustar hoje." };
    if (stage === "inicio") return { label: "Semana iniciando", tone: "muted", desc: "Execute a primeira ação." };
    return { label: "Crítico", tone: "destructive", desc: "Retomar com mínimo diário." };
  })();

  // Próxima ação
  let nextAction = "Manter execução. Próximo bloco planejado.";
  if (stage === "inicio" && noActivity) nextAction = "Comece a semana: 30 min de PSCPP ou check-in do dia.";
  else if (studyBlocks < 3) nextAction = "Hoje: fazer 30 min de PSCPP.";
  else if (trainingsCount === 0) nextAction = "Hoje: realizar treino planejado ou caminhada leve.";
  else if (avgSleep > 0 && avgSleep < SLEEP_MIN) nextAction = "Hoje: priorizar dormir antes de 23h30.";
  else if (longRun && (longRun.distance_km ?? 0) < LONGRUN_TARGET) nextAction = "Hoje/Sábado: agendar longão (≥ 8 km).";
  else if (strength.length === 0) nextAction = "Hoje: fortalecimento (mínimo 30 min).";
  else if (studyBlocks < STUDY_BLOCKS_TARGET) nextAction = "Hoje: completar 1 bloco PSCPP de 30 min.";

  // Weakness map (most recent occurrence per content)
  const weakMap = new Map<string, Study>();
  for (const s of weakStudies) {
    const key = `${s.subject ?? "?"} > ${s.specific_content ?? "?"}`;
    if (!weakMap.has(key)) weakMap.set(key, s);
  }
  const weaknesses = Array.from(weakMap.entries()).slice(0, 8);

  // Alerts grouped
  const greens: string[] = [];
  const yellows: string[] = [];
  const reds: string[] = [];

  // Estudo — alertas inteligentes
  if (!everStudied) {
    yellows.push("Nenhum bloco registrado ainda. Comece com 30 min hoje.");
  } else if (daysWithoutStudy >= 7) {
    reds.push("7 dias sem estudar. Hábito quebrado — reinicie com 15 min.");
  } else if (daysWithoutStudy >= 3) {
    reds.push("3 dias sem estudar. Retome hoje com bloco mínimo.");
  } else if (studyBlocks >= STUDY_BLOCKS_TARGET) {
    greens.push(`Meta de estudo batida: ${studyBlocks} blocos.`);
  } else if (stage !== "inicio" && studyBlocks < 3) {
    yellows.push("Atenção à consistência: menos de 3 blocos de estudo.");
  }

  if (trainingsCount >= 3) greens.push(`Treinos no plano: ${trainingsCount}.`);
  else if (trainingsCount >= 1) yellows.push("Volume de treino abaixo do plano.");
  else if (stage !== "inicio") reds.push("Corpo fora do plano: nenhum treino na semana.");

  if (avgSleep >= SLEEP_TARGET) greens.push(`Sono médio bom: ${avgSleep.toFixed(1)}h.`);
  else if (avgSleep >= SLEEP_MIN) yellows.push(`Sono no limite: ${avgSleep.toFixed(1)}h.`);
  else if (avgSleep > 0) reds.push(`Sono médio crítico: ${avgSleep.toFixed(1)}h.`);

  if (phoneAbuse > 2) yellows.push("Manhã sendo sequestrada: celular antes do primeiro bloco.");
  if (runs.length > 0 && totalDistKm < 15) yellows.push("Quilometragem semanal baixa para evolução na meia.");
  if (longRun && (longRun.distance_km ?? 0) < LONGRUN_TARGET) yellows.push("Longão ainda abaixo do planejado.");
  if (avgScore > 0 && avgScore < 70) yellows.push("Score de sono abaixo do ideal.");
  if (avgBb > 0 && avgBb < 70) yellows.push("Body Battery baixo: cuide da recuperação.");

  // Meia POA prep
  const weeksLeft = weeksUntil(MEIA_POA_DATE);
  const nextLongTarget = Math.min(20, Math.max(LONGRUN_TARGET, Math.round((longRun?.distance_km ?? LONGRUN_TARGET) + 1)));
  const meiaStatus =
    runs.length >= PILOTO_GOALS.runs && totalDistKm >= RUN_KM_TARGET && (longRun?.distance_km ?? 0) >= LONGRUN_TARGET
      ? { label: "No plano", tone: "success" as const }
      : runs.length >= 1
        ? { label: "Atenção", tone: "warning" as const }
        : { label: "Crítico", tone: "destructive" as const };

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

      <div className="flex gap-2 mb-5 flex-wrap">
        <Button asChild className="flex-1 sm:flex-none">
          <Link to="/checkin"><ClipboardCheck className="h-4 w-4 mr-1" /> Registrar dia</Link>
        </Button>
        <Button asChild variant="secondary" className="flex-1 sm:flex-none">
          <Link to="/study"><BookOpen className="h-4 w-4 mr-1" /> Registrar estudo</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 sm:flex-none">
          <Link to="/plan"><ListChecks className="h-4 w-4 mr-1" /> Plano semanal</Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="ml-auto">
          <Link to="/review"><Plus className="h-4 w-4" /></Link>
        </Button>
      </div>

      {/* STATUS DA SEMANA */}
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Status da semana</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatusCard
          title="Status geral"
          value={overall.label}
          tone={overall.tone}
          hint={overall.desc}
        />
        <StatusCard
          title="PSCPP"
          value={`${(totalStudyMin / 60).toFixed(1)}h`}
          hint={`${studyBlocks}/${STUDY_BLOCKS_TARGET} blocos`}
          tone={pscppScore >= 2 ? "success" : pscppScore >= 1 ? "warning" : "destructive"}
        />
        <StatusCard
          title="Corpo"
          value={`${trainingsCount} treinos`}
          hint={`Sono ${avgSleep ? avgSleep.toFixed(1) : "—"}h · Bateria ${avgBb ? avgBb.toFixed(0) : "—"}`}
          tone={corpoScore >= 1.5 ? "success" : corpoScore >= 1 ? "warning" : "destructive"}
        />
        <StatusCard
          title="Rotina"
          value={`${wakeOnTime}/7 acordar`}
          hint={`Cel ${phoneAbuse}/7 · Marmita ${meals}/7`}
          tone={rotinaScore >= 2.5 ? "success" : rotinaScore >= 1.5 ? "warning" : "destructive"}
        />
      </div>

      {/* PRÓXIMA AÇÃO */}
      <Card className="mb-5 border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Próxima ação</div>
            <div className="text-base font-medium leading-snug">{nextAction}</div>
          </div>
        </CardContent>
      </Card>

      {/* ALERTS */}
      {(greens.length > 0 || yellows.length > 0 || reds.length > 0) && (
        <div className="space-y-2 mb-5">
          {reds.map((a) => <ColoredAlert key={a} tone="red" text={a} />)}
          {yellows.map((a) => <ColoredAlert key={a} tone="yellow" text={a} />)}
          {greens.map((a) => <ColoredAlert key={a} tone="green" text={a} />)}
        </div>
      )}

      {/* MEIA POA */}
      <Card className="mb-5">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4 text-primary" /> Preparação Meia POA — 12/07</CardTitle>
          <Badge variant="outline" className={
            meiaStatus.tone === "success" ? "border-success/40 text-success" :
            meiaStatus.tone === "warning" ? "border-warning/40 text-warning" :
            "border-destructive/40 text-destructive"
          }>{meiaStatus.label}</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Mini label="Semanas restantes" value={`${weeksLeft}`} />
          <Mini label="Km na semana" value={`${totalDistKm.toFixed(2)} km`} hint={`Meta ${RUN_KM_TARGET}+ km`} />
          <Mini label="Maior longão"
            value={longRun?.distance_km ? formatDisplayDistance(longRun.distance_km, longRun.activity_type, longRun.activity_name) : "—"} />
          <Mini label="Próximo longão" value={`${nextLongTarget} km`} hint="Meta sugerida" />
          <Mini label="Corridas" value={`${runs.length}`} hint="Meta ≥ 2" />
          <Mini label="Fortalecimentos" value={`${strength.length}`} hint="Meta ≥ 1" />
          <Mini label="Pace médio" value={avgRunPaceSec ? secondsToPace(avgRunPaceSec) : "—"} />
          <Mini label="FC média" value={avgRunHr ? `${avgRunHr.toFixed(0)} bpm` : "—"} />
        </CardContent>
      </Card>

      {/* MAPA DE FRAQUEZAS */}
      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mapa de fraquezas</CardTitle>
        </CardHeader>
        <CardContent>
          {weaknesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem conteúdos com domínio ≤ 2 registrados ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {weaknesses.map(([key, s]) => (
                <li key={key} className="py-2 flex items-center justify-between gap-3">
                  <div className="text-sm">{key}</div>
                  <Badge variant="outline" className="border-warning/40 text-warning">domínio {s.mastery_level}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* WEEK STRIP */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Execução diária</CardTitle>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Dot active color="bg-chart-3" /> check-in</span>
            <span className="flex items-center gap-1"><Dot active color="bg-primary" /> estudo</span>
            <span className="flex items-center gap-1"><Dot active color="bg-success" /> treino</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const ds = fmtDate(d);
              const c = checkins.find((x) => x.date === ds);
              const studied = studies.some((x) => x.date === ds);
              const trained = trainings.some((x) => x.date === ds) || gTrainings.some((x) => x.activity_date === ds);
              return (
                <div key={ds} className="rounded-md border border-border p-2 text-center bg-card/40">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                  </div>
                  <div className="text-sm font-medium mb-1">{d.getDate()}</div>
                  <div className="flex justify-center gap-1">
                    <Dot active={!!c} color="bg-chart-3" />
                    <Dot active={studied} color="bg-primary" />
                    <Dot active={trained} color="bg-success" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <Progress value={Math.min(100, (overallScore / 7) * 100)} className="h-1" />
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Dot({ active, color }: { active: boolean; color: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${active ? color : "bg-muted"}`} />;
}

function Mini({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function StatusCard({
  title, value, hint, tone,
}: { title: string; value: string; hint?: string; tone: "success" | "warning" | "destructive" | "muted" }) {
  const cls =
    tone === "success" ? "border-success/40 bg-success/5" :
    tone === "warning" ? "border-warning/40 bg-warning/5" :
    tone === "destructive" ? "border-destructive/40 bg-destructive/5" :
                         "border-border bg-card/40";
  const valueCls =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "destructive" ? "text-destructive" :
                         "text-foreground";
  return (
    <Card className={cls}>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className={`text-xl font-semibold mt-1 ${valueCls}`}>{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function ColoredAlert({ tone, text }: { tone: "green" | "yellow" | "red"; text: string }) {
  const cls =
    tone === "green" ? "border-success/40 bg-success/5" :
    tone === "yellow" ? "border-warning/40 bg-warning/5" :
                        "border-destructive/40 bg-destructive/5";
  const Icon = tone === "green" ? CheckCircle2 : tone === "yellow" ? AlertTriangle : AlertCircle;
  const iconCls = tone === "green" ? "text-success" : tone === "yellow" ? "text-warning" : "text-destructive";
  return (
    <Alert className={cls}>
      <Icon className={`h-4 w-4 ${iconCls}`} />
      <AlertDescription className="text-sm">{text}</AlertDescription>
    </Alert>
  );
}
