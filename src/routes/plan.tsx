import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, startOfWeek, fmtDate, fmtWeekLabel } from "@/lib/week";
import {
  DAY_LABEL, DEFAULT_PLAN, PLAN_STATUSES, PLAN_CATEGORY_TARGET,
  PlanCategory, PlanStatus,
} from "@/lib/plan-template";
import { toast } from "sonner";

export const Route = createFileRoute("/plan")({
  head: () => ({ meta: [{ title: "Plano Semanal — PSCPP" }, { name: "description", content: "Checklist semanal de PSCPP, Corpo e Vida." }] }),
  component: PlanPage,
});

type Item = {
  id: string;
  week_start: string;
  category: string;
  day_of_week: number;
  title: string;
  detail: string | null;
  status: string;
};

type PendingAction =
  | { kind: "pscpp"; item: Item; date: string }
  | { kind: "corpo"; item: Item; date: string }
  | null;

function PlanPage() {
  const { user, loading } = useAuthGate();
  const [weekRef, setWeekRef] = useState(new Date());
  const start = useMemo(() => startOfWeek(weekRef), [weekRef]);
  const weekStart = fmtDate(start);
  const [items, setItems] = useState<Item[]>([]);
  const [pending, setPending] = useState<PendingAction>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("weekly_plan_items")
      .select("id,week_start,category,day_of_week,title,detail,status")
      .eq("week_start", weekStart)
      .order("day_of_week");
    let rows = (data ?? []) as Item[];
    if (rows.length === 0) {
      const seed = DEFAULT_PLAN.map((d) => ({
        user_id: user.id, week_start: weekStart,
        category: d.category, day_of_week: d.day_of_week,
        title: d.title, detail: d.detail ?? null, status: "pendente",
      }));
      // Upsert ignoring duplicates so concurrent loads never create duplicates.
      await supabase
        .from("weekly_plan_items")
        .upsert(seed, {
          onConflict: "user_id,week_start,category,day_of_week,title",
          ignoreDuplicates: true,
        });
      const { data: re } = await supabase
        .from("weekly_plan_items")
        .select("id,week_start,category,day_of_week,title,detail,status")
        .eq("week_start", weekStart)
        .order("day_of_week");
      rows = (re ?? []) as Item[];
    }
    setItems(rows);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, weekStart]);

  if (loading || !user) return null;

  const itemDate = (it: Item): string => fmtDate(addDays(start, it.day_of_week - 1));

  const updateStatus = async (it: Item, status: PlanStatus) => {
    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, status } : x)));
    const { error } = await supabase.from("weekly_plan_items").update({ status }).eq("id", it.id);
    if (error) { toast.error(error.message); return; }

    // Quick-action: ao marcar feito, perguntar se cria registro automático
    if (status === "feito") {
      const date = itemDate(it);
      if (it.category === "PSCPP") setPending({ kind: "pscpp", item: it, date });
      else if (it.category === "Corpo") setPending({ kind: "corpo", item: it, date });
    }
  };

  const confirmQuickAction = async () => {
    if (!pending || !user) return;
    if (pending.kind === "pscpp") {
      const tpl = DEFAULT_PLAN.find(
        (d) => d.category === "PSCPP" && d.day_of_week === pending.item.day_of_week && d.title === pending.item.title,
      );
      const duration = tpl?.duration_min ?? 30;
      const { error } = await supabase.from("study_sessions").insert({
        user_id: user.id, date: pending.date,
        subject: pending.item.title, type: "teoria",
        duration_minutes: duration,
      });
      if (error) toast.error(error.message);
      else toast.success("Estudo registrado.");
    } else if (pending.kind === "corpo") {
      // Tenta associar a treino Garmin da mesma data antes de criar manual
      const { data: g } = await supabase
        .from("garmin_training_sessions")
        .select("id")
        .eq("activity_date", pending.date)
        .limit(1);
      if (g && g.length > 0) {
        toast.success("Treino Garmin do dia já registrado — vinculado.");
      } else {
        const isRun = /corrida|longão|longao/i.test(pending.item.title);
        const isLong = /longão|longao/i.test(pending.item.title);
        const tpl = DEFAULT_PLAN.find(
          (d) => d.category === "Corpo" && d.day_of_week === pending.item.day_of_week && d.title === pending.item.title,
        );
        const { error } = await supabase.from("training_sessions").insert({
          user_id: user.id, date: pending.date,
          type: isRun ? "corrida" : "fortalecimento",
          duration_minutes: tpl?.duration_min ?? 45,
          is_long_run: isLong,
        });
        if (error) toast.error(error.message);
        else toast.success("Treino manual registrado.");
      }
    }
    setPending(null);
  };

  const cats: PlanCategory[] = ["PSCPP", "Corpo", "Vida"];

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plano semanal</h1>
          <p className="text-sm text-muted-foreground">{fmtWeekLabel(weekRef)} · Projeto Piloto Maio/2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekRef(addDays(weekRef, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekRef(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekRef(addDays(weekRef, 7))}><ChevronRight className="h-4 w-4" /></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/">Voltar</Link></Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {cats.map((cat) => {
          const list = items.filter((i) => i.category === cat).sort((a, b) => a.day_of_week - b.day_of_week);
          const target = PLAN_CATEGORY_TARGET[cat];
          const done = list.filter((i) => i.status === "feito").length;
          const pct = Math.min(100, (done / target) * 100);
          return (
            <Card key={cat}>
              <CardHeader className="pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cat}</CardTitle>
                  <Badge variant="outline" className="text-xs">{done}/{target}</Badge>
                </div>
                <Progress value={pct} className="h-1.5" />
              </CardHeader>
              <CardContent className="space-y-2">
                {list.length === 0 && <p className="text-sm text-muted-foreground">Sem itens.</p>}
                {list.map((it) => (
                  <div key={it.id} className="border border-border rounded-md p-2.5 flex items-start justify-between gap-2 bg-card/40">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{DAY_LABEL[it.day_of_week]}</div>
                      <div className="text-sm font-medium leading-tight">{it.title}</div>
                      {it.detail && <div className="text-xs text-muted-foreground">{it.detail}</div>}
                    </div>
                    <Select value={it.status} onValueChange={(v) => updateStatus(it, v as PlanStatus)}>
                      <SelectTrigger className={`h-8 w-[120px] text-xs ${statusClass(it.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "pscpp" ? "Registrar estudo?" : "Registrar treino?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "pscpp"
                ? `Criar um Registro de Estudo para "${pending.item.title}" em ${pending.date}?`
                : `Criar treino manual para "${pending?.item.title}" em ${pending?.date}? Se houver treino Garmin da mesma data, será vinculado.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={confirmQuickAction}>Registrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function statusClass(s: string): string {
  if (s === "feito") return "border-success/40 text-success";
  if (s === "pulado") return "border-destructive/40 text-destructive";
  if (s === "reagendado") return "border-warning/40 text-warning";
  return "";
}
