import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { allStudyMaterials, studyClusters } from "@/data/pscppSeed";
import { toast } from "sonner";
import { fmtDate } from "@/lib/week";

export const Route = createFileRoute("/study")({
  head: () => ({
    meta: [
      { title: "Registro de estudo — PSCPP" },
      { name: "description", content: "Registre cada bloco de estudo PSCPP." },
    ],
  }),
  component: StudyPage,
});

const TYPES = ["leitura", "resumo", "questões", "revisão", "simulado", "aula"];

type Row = {
  id: string;
  date: string;
  subject: string;
  type: string;
  duration_minutes: number;
  questions: number;
  correct: number;
  specific_content: string | null;
  mastery_level: number | null;
  source: string | null;
};

function StudyPage() {
  const { user, loading } = useAuthGate();
  const [date, setDate] = useState(fmtDate(new Date()));
  const [clusterId, setClusterId] = useState(studyClusters[0].id);
  const [topic, setTopic] = useState(studyClusters[0].topics[0]);
  const [materialId, setMaterialId] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [duration, setDuration] = useState("40");
  const [questions, setQuestions] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [next, setNext] = useState("");
  const [mastery, setMastery] = useState("3");
  const [errors, setErrors] = useState("");
  const [recent, setRecent] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedCluster =
    studyClusters.find((cluster) => cluster.id === clusterId) ?? studyClusters[0];
  const clusterMaterials = useMemo(
    () => allStudyMaterials.filter((material) => material.clusterIds.includes(clusterId)),
    [clusterId],
  );
  const selectedMaterial = clusterMaterials.find((material) => material.id === materialId);

  const refresh = async () => {
    const { data } = await supabase
      .from("study_sessions")
      .select(
        "id,date,subject,type,duration_minutes,questions,correct,specific_content,mastery_level,source",
      )
      .order("date", { ascending: false })
      .limit(10);
    setRecent((data ?? []) as Row[]);
  };

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  useEffect(() => {
    setTopic(selectedCluster.topics[0]);
    setMaterialId("");
  }, [clusterId, selectedCluster.topics]);

  if (loading || !user) return null;

  const save = async () => {
    if (!duration) return toast.error("Informe a duração");
    setSaving(true);
    const { error } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      date,
      subject: selectedCluster.name,
      type,
      duration_minutes: Number(duration),
      questions: Number(questions) || 0,
      correct: Number(correct) || 0,
      wrong: Number(wrong) || 0,
      difficulty: difficulty || null,
      next_action: next || null,
      specific_content: topic || null,
      mastery_level: Number(mastery) || null,
      source: selectedMaterial?.title ?? null,
      errors_to_review: errors || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Estudo registrado");
    setQuestions("");
    setCorrect("");
    setWrong("");
    setDifficulty("");
    setNext("");
    setErrors("");
    refresh();
  };

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Registro de estudo</h1>
          <p className="text-sm text-muted-foreground">
            Registre cada bloco conectado a cluster, tópico e material.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/">Voltar</Link>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Novo bloco PSCPP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Data">
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </F>
              <F label="Duração prevista/realizada (min)">
                <Input
                  type="number"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </F>
              <F label="Cluster">
                <Select value={clusterId} onValueChange={setClusterId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {studyClusters.map((cluster) => (
                      <SelectItem key={cluster.id} value={cluster.id}>
                        {cluster.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Tipo de estudo">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
            </div>

            <F label="Tópico">
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedCluster.topics.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>

            <F label="Material usado">
              <Select
                value={materialId || "sem-material"}
                onValueChange={(value) => setMaterialId(value === "sem-material" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-material">Sem material definido</SelectItem>
                  {clusterMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>

            <div className="grid gap-3 sm:grid-cols-3">
              <F label="Questões">
                <Input
                  type="number"
                  value={questions}
                  onChange={(event) => setQuestions(event.target.value)}
                />
              </F>
              <F label="Acertos">
                <Input
                  type="number"
                  value={correct}
                  onChange={(event) => setCorrect(event.target.value)}
                />
              </F>
              <F label="Erros">
                <Input
                  type="number"
                  value={wrong}
                  onChange={(event) => setWrong(event.target.value)}
                />
              </F>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Domínio percebido (1–5)">
                <Select value={mastery} onValueChange={setMastery}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((number) => (
                      <SelectItem key={number} value={String(number)}>
                        {number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <div className="rounded-md border border-border bg-card/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Contexto
                </div>
                <div className="mt-1 text-sm font-medium">
                  {selectedCluster.priority} prioridade
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {clusterMaterials.length} materiais vinculados
                </div>
              </div>
            </div>

            <F label="Principal dificuldade">
              <Textarea
                rows={2}
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              />
            </F>
            <F label="Erros para revisar">
              <Textarea
                rows={2}
                value={errors}
                onChange={(event) => setErrors(event.target.value)}
              />
            </F>
            <F label="Próxima ação objetiva">
              <Textarea
                rows={2}
                value={next}
                onChange={(event) => setNext(event.target.value)}
                placeholder="Ex: reler páginas 12-16 e criar 5 bullets."
              />
            </F>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Salvando…" : "Salvar bloco"}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Últimos blocos</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum estudo registrado ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {row.subject}{" "}
                        <span className="font-normal text-muted-foreground">· {row.type}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(row.date).toLocaleDateString("pt-BR")} · {row.duration_minutes}{" "}
                        min
                        {row.specific_content ? ` · ${row.specific_content}` : ""}
                      </div>
                      {row.source && (
                        <div className="text-xs text-muted-foreground">{row.source}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant="outline">
                        {Math.round((row.duration_minutes / 60) * 10) / 10}h
                      </Badge>
                      {row.questions ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {row.correct}/{row.questions}
                        </div>
                      ) : null}
                    </div>
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
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
