import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { fmtDate, addDays, startOfWeek } from "@/lib/week";
import { classifyTraining, paceToSeconds, secondsToPace, formatDisplayDistance, type TrainingCategory } from "@/lib/garmin-training";

export const Route = createFileRoute("/garmin-trainings")({
  head: () => ({ meta: [{ title: "Garmin Treinos — PSCPP" }, { name: "description", content: "Histórico de treinos importados do Garmin." }] }),
  component: GarminTrainings,
});

type Row = {
  id: string;
  activity_date: string;
  activity_datetime: string | null;
  activity_name: string | null;
  activity_type: string | null;
  duration_minutes: number | null;
  distance_km: number | null;
  average_pace: string | null;
  average_heart_rate: number | null;
  calories: number | null;
};

function GarminTrainings() {
  const { user, loading } = useAuthGate();
  const [from, setFrom] = useState(fmtDate(addDays(new Date(), -59)));
  const [to, setTo] = useState(fmtDate(new Date()));
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<TrainingCategory | "all">("all");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("garmin_training_sessions")
        .select("id,activity_date,activity_datetime,activity_name,activity_type,duration_minutes,distance_km,average_pace,average_heart_rate,calories")
        .gte("activity_date", from).lte("activity_date", to)
        .order("activity_date", { ascending: false });
      setRows((data ?? []) as Row[]);
    })();
  }, [user, from, to]);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.activity_type).filter(Boolean) as string[])), [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (typeFilter !== "all" && r.activity_type !== typeFilter) return false;
    if (catFilter !== "all" && classifyTraining(r.activity_type) !== catFilter) return false;
    return true;
  }), [rows, typeFilter, catFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const distance = filtered.reduce((a, r) => a + (r.distance_km ?? 0), 0);
    const duration = filtered.reduce((a, r) => a + (r.duration_minutes ?? 0), 0);
    const runs = filtered.filter((r) => classifyTraining(r.activity_type) === "corrida");
    const longest = runs.reduce<Row | null>((acc, r) => ((r.distance_km ?? 0) > (acc?.distance_km ?? 0) ? r : acc), null);
    const hrs = runs.map((r) => r.average_heart_rate).filter((v): v is number => v !== null);
    const avgHr = hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : 0;
    const paces = runs.map((r) => paceToSeconds(r.average_pace)).filter((v): v is number => v !== null);
    const avgPaceSec = paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : 0;
    return { total, distance, duration, longest, avgHr, avgPaceSec };
  }, [filtered]);

  const weekly = useMemo(() => {
    const map = new Map<string, { week: string; trainings: number; distance: number; duration: number; hr: number; hrCount: number }>();
    for (const r of filtered) {
      const wk = fmtDate(startOfWeek(new Date(r.activity_date)));
      const e = map.get(wk) ?? { week: wk, trainings: 0, distance: 0, duration: 0, hr: 0, hrCount: 0 };
      e.trainings += 1;
      e.distance += r.distance_km ?? 0;
      e.duration += r.duration_minutes ?? 0;
      if (r.average_heart_rate) { e.hr += r.average_heart_rate; e.hrCount += 1; }
      map.set(wk, e);
    }
    return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week)).map((e) => ({
      week: e.week.slice(5),
      trainings: e.trainings,
      distance: Number(e.distance.toFixed(2)),
      duration: Math.round(e.duration),
      hr: e.hrCount ? Math.round(e.hr / e.hrCount) : 0,
    }));
  }, [filtered]);

  const hrSeries = useMemo(() => filtered
    .filter((r) => r.average_heart_rate)
    .slice()
    .sort((a, b) => a.activity_date.localeCompare(b.activity_date))
    .map((r) => ({ date: r.activity_date.slice(5), hr: r.average_heart_rate })), [filtered]);

  if (loading || !user) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Garmin Treinos</h1>
          <p className="text-sm text-muted-foreground">Histórico, filtros e tendências semanais.</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/">Voltar</Link></Button>
      </div>

      <Card className="mb-5">
        <CardContent className="p-4 grid sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Categoria</Label>
            <Select value={catFilter} onValueChange={(v) => setCatFilter(v as TrainingCategory | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="corrida">Corrida</SelectItem>
                <SelectItem value="fortalecimento">Fortalecimento</SelectItem>
                <SelectItem value="caminhada">Caminhada</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Treinos" value={stats.total} />
        <Stat label="Distância total" value={`${stats.distance.toFixed(1)} km`} />
        <Stat label="Tempo total" value={`${(stats.duration / 60).toFixed(1)} h`} hint={`${Math.round(stats.duration)} min`} />
        <Stat label="Maior corrida" value={stats.longest?.distance_km ? `${stats.longest.distance_km.toFixed(1)} km` : "—"} hint={stats.longest?.activity_date ?? ""} />
        <Stat label="FC média (corrida)" value={stats.avgHr ? stats.avgHr.toFixed(0) : "—"} hint="bpm" />
        <Stat label="Pace médio (corrida)" value={stats.avgPaceSec ? secondsToPace(stats.avgPaceSec) : "—"} />
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <ChartCard title="Distância corrida por semana (km)">
          <BarChart data={weekly}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="distance" fill="hsl(var(--primary))" />
          </BarChart>
        </ChartCard>
        <ChartCard title="Treinos por semana">
          <BarChart data={weekly}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="trainings" fill="hsl(var(--chart-3))" />
          </BarChart>
        </ChartCard>
        <ChartCard title="Duração total por semana (min)">
          <BarChart data={weekly}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="duration" fill="hsl(var(--chart-2))" />
          </BarChart>
        </ChartCard>
        <ChartCard title="FC média por treino">
          <LineChart data={hrSeries}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Line type="monotone" dataKey="hr" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartCard>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Treinos no período</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground"><tr>
              <th className="text-left p-2">Data</th><th className="text-left p-2">Atividade</th>
              <th className="text-left p-2">Tipo</th><th className="text-left p-2">Categoria</th>
              <th className="text-right p-2">Dur (min)</th><th className="text-right p-2">Dist (km)</th>
              <th className="text-left p-2">Pace</th><th className="text-right p-2">FC</th><th className="text-right p-2">Cal</th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2 font-medium">{r.activity_date}</td>
                  <td className="p-2">{r.activity_name ?? "—"}</td>
                  <td className="p-2">{r.activity_type ?? "—"}</td>
                  <td className="p-2 text-primary">{classifyTraining(r.activity_type)}</td>
                  <td className="p-2 text-right">{r.duration_minutes?.toFixed(1) ?? "—"}</td>
                  <td className="p-2 text-right">{formatDisplayDistance(r.distance_km, r.activity_type, r.activity_name)}</td>
                  <td className="p-2">{r.average_pace ?? "—"}</td>
                  <td className="p-2 text-right">{r.average_heart_rate ?? "—"}</td>
                  <td className="p-2 text-right">{r.calories ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Sem treinos no período. Importe um CSV do Garmin Connect.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </CardContent></Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
