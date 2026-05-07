import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { parseDurationToHours } from "@/lib/garmin";
import { fmtDate, addDays } from "@/lib/week";

export const Route = createFileRoute("/garmin-sleep")({
  head: () => ({ meta: [{ title: "Garmin Sono — PSCPP" }, { name: "description", content: "Histórico de sono e recuperação." }] }),
  component: GarminSleep,
});

type Row = {
  date: string;
  sleep_score: number | null;
  resting_heart_rate: number | null;
  body_battery: number | null;
  respiration: number | null;
  hrv_status: string | null;
  sleep_quality: string | null;
  sleep_duration: string | null;
  bedtime: string | null;
  wake_time: string | null;
};

function GarminSleep() {
  const { user, loading } = useAuthGate();
  const [from, setFrom] = useState(fmtDate(addDays(new Date(), -29)));
  const [to, setTo] = useState(fmtDate(new Date()));
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("garmin_sleep_metrics")
        .select("date,sleep_score,resting_heart_rate,body_battery,respiration,hrv_status,sleep_quality,sleep_duration,bedtime,wake_time")
        .gte("date", from).lte("date", to)
        .order("date", { ascending: true });
      setRows((data ?? []) as Row[]);
    })();
  }, [user, from, to]);

  const stats = useMemo(() => {
    const avg = (xs: (number | null)[]) => {
      const v = xs.filter((x): x is number => x !== null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
    };
    const dur = rows.map((r) => parseDurationToHours(r.sleep_duration));
    return {
      avgScore: avg(rows.map((r) => r.sleep_score)),
      avgRhr: avg(rows.map((r) => r.resting_heart_rate)),
      avgBb: avg(rows.map((r) => r.body_battery)),
      avgDur: avg(dur),
    };
  }, [rows]);

  if (loading || !user) return null;

  const chart = rows.map((r) => ({
    date: r.date.slice(5),
    score: r.sleep_score ?? null,
    rhr: r.resting_heart_rate ?? null,
    bb: r.body_battery ?? null,
  }));

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Garmin Sono</h1>
          <p className="text-sm text-muted-foreground">Histórico de sono e recuperação</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/import-garmin">Importar CSV</Link></Button>
      </div>

      <Card className="mb-5">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{rows.length} registros</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Score médio" value={stats.avgScore ? stats.avgScore.toFixed(0) : "—"} />
        <Stat label="Sono médio" value={stats.avgDur ? `${stats.avgDur.toFixed(1)}h` : "—"} />
        <Stat label="FC rep. média" value={stats.avgRhr ? stats.avgRhr.toFixed(0) : "—"} hint="bpm" />
        <Stat label="Body Battery médio" value={stats.avgBb ? stats.avgBb.toFixed(0) : "—"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <ChartCard title="Sleep Score" data={chart} dataKey="score" color="hsl(var(--primary))" />
        <ChartCard title="FC em repouso" data={chart} dataKey="rhr" color="hsl(var(--destructive))" />
        <ChartCard title="Body Battery" data={chart} dataKey="bb" color="hsl(var(--success))" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Registros</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro no período. <Link to="/import-garmin" className="text-primary underline">Importar CSV</Link></p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Data</th>
                  <th className="text-right p-2">Score</th>
                  <th className="text-left p-2">Duração</th>
                  <th className="text-right p-2">FC rep.</th>
                  <th className="text-right p-2">Body Bat.</th>
                  <th className="text-right p-2">Resp.</th>
                  <th className="text-left p-2">VFC</th>
                  <th className="text-left p-2">Qualidade</th>
                  <th className="text-left p-2">Dormir</th>
                  <th className="text-left p-2">Acordar</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.date} className="border-t border-border">
                    <td className="p-2 font-medium">{new Date(r.date).toLocaleDateString("pt-BR")}</td>
                    <td className="p-2 text-right">{r.sleep_score ?? "—"}</td>
                    <td className="p-2">{r.sleep_duration ?? "—"}</td>
                    <td className="p-2 text-right">{r.resting_heart_rate ?? "—"}</td>
                    <td className="p-2 text-right">{r.body_battery ?? "—"}</td>
                    <td className="p-2 text-right">{r.respiration ?? "—"}</td>
                    <td className="p-2">{r.hrv_status ?? "—"}</td>
                    <td className="p-2">{r.sleep_quality ?? "—"}</td>
                    <td className="p-2">{r.bedtime ?? "—"}</td>
                    <td className="p-2">{r.wake_time ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, data, dataKey, color }: { title: string; data: any[]; dataKey: string; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
