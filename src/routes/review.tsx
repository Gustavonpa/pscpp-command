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
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { fmtDate, startOfWeek } from "@/lib/week";

export const Route = createFileRoute("/review")({
  head: () => ({ meta: [{ title: "Revisão semanal — PSCPP" }, { name: "description", content: "Revisão semanal: o que funcionou, o que travou e foco da próxima semana." }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const { user, loading } = useAuthGate();
  const [weekStart, setWeekStart] = useState(fmtDate(startOfWeek(new Date())));
  const [rating, setRating] = useState(7);
  const [worked, setWorked] = useState("");
  const [blocked, setBlocked] = useState("");
  const [distraction, setDistraction] = useState("");
  const [o2con, setO2con] = useState("");
  const [o2finance, setO2finance] = useState("");
  const [relationship, setRelationship] = useState("");
  const [focus, setFocus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("week_start", weekStart)
        .maybeSingle();
      if (data) {
        setRating(data.rating ?? 7);
        setWorked(data.what_worked ?? "");
        setBlocked(data.what_blocked ?? "");
        setDistraction(data.biggest_distraction ?? "");
        setO2con(data.o2con_progress ?? "");
        setO2finance(data.o2finance_progress ?? "");
        setRelationship(data.relationship_quality ?? "");
        setFocus(data.next_week_focus ?? "");
      } else {
        setWorked(""); setBlocked(""); setDistraction("");
        setO2con(""); setO2finance(""); setRelationship(""); setFocus("");
      }
    })();
  }, [user, weekStart]);

  if (loading || !user) return null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("weekly_reviews").upsert(
      {
        user_id: user.id,
        week_start: weekStart,
        rating,
        what_worked: worked || null,
        what_blocked: blocked || null,
        biggest_distraction: distraction || null,
        o2con_progress: o2con || null,
        o2finance_progress: o2finance || null,
        relationship_quality: relationship || null,
        next_week_focus: focus || null,
      },
      { onConflict: "user_id,week_start" }
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Revisão salva");
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revisão semanal</h1>
          <p className="text-sm text-muted-foreground">Decida em vez de reagir.</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/">Voltar</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Semana</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <F label="Início da semana (segunda-feira)">
            <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </F>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nota da semana</Label>
              <span className="text-sm font-medium">{rating}/10</span>
            </div>
            <Slider value={[rating]} min={0} max={10} step={1} onValueChange={(v) => setRating(v[0])} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <F label="O que funcionou"><Textarea rows={3} value={worked} onChange={(e) => setWorked(e.target.value)} /></F>
            <F label="O que travou"><Textarea rows={3} value={blocked} onChange={(e) => setBlocked(e.target.value)} /></F>
            <F label="Maior distração"><Textarea rows={2} value={distraction} onChange={(e) => setDistraction(e.target.value)} /></F>
            <F label="Avanço na O2con"><Textarea rows={2} value={o2con} onChange={(e) => setO2con(e.target.value)} /></F>
            <F label="Avanço no O2finance"><Textarea rows={2} value={o2finance} onChange={(e) => setO2finance(e.target.value)} /></F>
            <F label="Relacionamento / vida pessoal"><Textarea rows={2} value={relationship} onChange={(e) => setRelationship(e.target.value)} /></F>
          </div>
          <F label="Foco da próxima semana">
            <Textarea rows={3} value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="3 coisas, no máximo." />
          </F>
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Salvando…" : "Salvar revisão"}
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
