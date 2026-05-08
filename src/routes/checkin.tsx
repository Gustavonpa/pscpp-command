import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { fmtDate } from "@/lib/week";

export const Route = createFileRoute("/checkin")({
  head: () => ({ meta: [{ title: "Check-in diário — PSCPP" }, { name: "description", content: "Registro diário de sono, energia e rotina." }] }),
  component: CheckinPage,
});

type GarminTr = {
  activity_type: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
  average_heart_rate: number | null;
};

function CheckinPage() {
  const { user, loading } = useAuthGate();
  const [date, setDate] = useState(fmtDate(new Date()));
  const [wakeTime, setWakeTime] = useState("06:15");
  const [sleepHours, setSleepHours] = useState("7");
  const [garmin, setGarmin] = useState("");
  const [energy, setEnergy] = useState(7);
  const [mood, setMood] = useState(7);
  const [didTraining, setDidTraining] = useState(false);
  const [didStudy, setDidStudy] = useState(false);
  const [phone, setPhone] = useState(false);
  const [meal, setMeal] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [garminTrainings, setGarminTrainings] = useState<GarminTr[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, { data: gt }] = await Promise.all([
        supabase.from("daily_checkins").select("*").eq("date", date).maybeSingle(),
        supabase.from("garmin_training_sessions")
          .select("activity_type,distance_km,duration_minutes,average_heart_rate")
          .eq("activity_date", date),
      ]);
      if (data) {
        setWakeTime(data.wake_time?.slice(0, 5) ?? "06:15");
        setSleepHours(String(data.sleep_hours ?? "7"));
        setGarmin(data.garmin_sleep_score?.toString() ?? "");
        setEnergy(data.energy ?? 7);
        setMood(data.mood ?? 7);
        setDidTraining(!!data.did_training);
        setDidStudy(!!data.did_study);
        setPhone(!!data.phone_before_block);
        setMeal(!!data.meal_ready);
        setNotes(data.notes ?? "");
      }
      setGarminTrainings((gt ?? []) as GarminTr[]);
    })();
  }, [user, date]);

  if (loading || !user) return null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("daily_checkins").upsert(
      {
        user_id: user.id,
        date,
        wake_time: wakeTime,
        sleep_hours: Number(sleepHours) || null,
        garmin_sleep_score: garmin ? Number(garmin) : null,
        energy,
        mood,
        did_training: didTraining,
        did_study: didStudy,
        phone_before_block: phone,
        meal_ready: meal,
        notes: notes || null,
      },
      { onConflict: "user_id,date" }
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Check-in salvo");
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Check-in diário</h1>
          <p className="text-sm text-muted-foreground">Rápido. Honesto. Sem desculpas.</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/">Voltar</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Hoje</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Data"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Acordei às"><Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} /></Field>
            <Field label="Horas de sono"><Input type="number" step="0.25" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} /></Field>
          </div>
          <Field label="Nota de sono Garmin (opcional)">
            <Input type="number" min={0} max={100} value={garmin} onChange={(e) => setGarmin(e.target.value)} placeholder="0–100" />
          </Field>
          <SliderField label="Energia" value={energy} onChange={setEnergy} />
          <SliderField label="Humor" value={mood} onChange={setMood} />

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <Toggle label="Fiz treino" value={didTraining} onChange={setDidTraining} />
            <Toggle label="Fiz estudo" value={didStudy} onChange={setDidStudy} />
            <Toggle label="Usei celular antes do 1º bloco" value={phone} onChange={setPhone} warn />
            <Toggle label="Janta/marmita pronta" value={meal} onChange={setMeal} />
          </div>

          <Field label="Observações">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="O que pesou, o que ajudou…" />
          </Field>

          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Salvando…" : "Salvar check-in"}
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label><span className="text-sm font-medium">{value}/10</span></div>
      <Slider value={[value]} min={0} max={10} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function Toggle({ label, value, onChange, warn }: { label: string; value: boolean; onChange: (v: boolean) => void; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card/40 px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} className={warn && value ? "data-[state=checked]:bg-destructive" : ""} />
    </div>
  );
}
