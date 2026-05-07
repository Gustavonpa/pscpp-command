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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtDate } from "@/lib/week";

export const Route = createFileRoute("/study")({
  head: () => ({ meta: [{ title: "Registro de estudo — PSCPP" }, { name: "description", content: "Registre cada bloco de estudo PSCPP." }] }),
  component: StudyPage,
});

const SUBJECTS = ["Matemática", "Inglês", "Náutica", "Física", "Português", "Legislação", "Revisão", "Simulado"];
const TYPES = ["teoria", "exercício", "revisão", "simulado"];

type Row = {
  id: string; date: string; subject: string; type: string;
  duration_minutes: number; questions: number; correct: number;
};

function StudyPage() {
  const { user, loading } = useAuthGate();
  const [date, setDate] = useState(fmtDate(new Date()));
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [type, setType] = useState(TYPES[0]);
  const [duration, setDuration] = useState("45");
  const [questions, setQuestions] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [next, setNext] = useState("");
  const [recent, setRecent] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const { data } = await supabase
      .from("study_sessions")
      .select("id,date,subject,type,duration_minutes,questions,correct")
      .order("date", { ascending: false })
      .limit(10);
    setRecent((data ?? []) as Row[]);
  };

  useEffect(() => { if (user) refresh(); }, [user]);
  if (loading || !user) return null;

  const save = async () => {
    if (!duration) return toast.error("Informe a duração");
    setSaving(true);
    const { error } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      date,
      subject,
      type,
      duration_minutes: Number(duration),
      questions: Number(questions) || 0,
      correct: Number(correct) || 0,
      wrong: Number(wrong) || 0,
      difficulty: difficulty || null,
      next_action: next || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Estudo registrado");
    setQuestions(""); setCorrect(""); setWrong(""); setDifficulty(""); setNext("");
    refresh();
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Registro de estudo</h1>
          <p className="text-sm text-muted-foreground">Um bloco por vez. Disciplina sobre intensidade.</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/">Voltar</Link></Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Novo bloco</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <F label="Data"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></F>
              <F label="Duração (min)"><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></F>
              <F label="Matéria">
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Tipo">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Questões"><Input type="number" value={questions} onChange={(e) => setQuestions(e.target.value)} /></F>
              <F label="Acertos"><Input type="number" value={correct} onChange={(e) => setCorrect(e.target.value)} /></F>
              <F label="Erros"><Input type="number" value={wrong} onChange={(e) => setWrong(e.target.value)} /></F>
            </div>
            <F label="Principal dificuldade">
              <Textarea rows={2} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
            </F>
            <F label="Próxima ação">
              <Textarea rows={2} value={next} onChange={(e) => setNext(e.target.value)} />
            </F>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Salvando…" : "Salvar bloco"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Últimos blocos</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum estudo registrado ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((r) => (
                  <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{r.subject} <span className="text-muted-foreground font-normal">· {r.type}</span></div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.date).toLocaleDateString("pt-BR")} · {r.duration_minutes} min
                        {r.questions ? ` · ${r.correct}/${r.questions}` : ""}
                      </div>
                    </div>
                    <span className="text-xs text-primary font-medium">{Math.round(r.duration_minutes / 60 * 10) / 10}h</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
