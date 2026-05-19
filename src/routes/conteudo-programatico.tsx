import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePscppData } from "@/hooks/usePscppData";
import type { ProgramTopic, PscppPriority } from "@/types/pscpp";
import { toast } from "sonner";

export const Route = createFileRoute("/conteudo-programatico")({
  head: () => ({
    meta: [
      { title: "Conteúdo Programático — PSCPP" },
      { name: "description", content: "Tópicos prováveis do conteúdo programático PSCPP." },
    ],
  }),
  component: ConteudoProgramaticoPage,
});

function ConteudoProgramaticoPage() {
  const { user, loading } = useAuthGate();
  const {
    clusters,
    materials,
    topics,
    loading: loadingPscppData,
    source,
    updateTopic,
  } = usePscppData();
  const [query, setQuery] = useState("");
  const [cluster, setCluster] = useState("todos");
  const [status, setStatus] = useState("todos");

  const rows = useMemo(() => {
    return topics.filter((topic) => {
      const matchesQuery = topic.name.toLowerCase().includes(query.toLowerCase());
      const matchesCluster = cluster === "todos" || topic.clusterId === cluster;
      const matchesStatus = status === "todos" || topic.studyStatus === status;
      return matchesQuery && matchesCluster && matchesStatus;
    });
  }, [cluster, query, status, topics]);

  if (loading || !user || loadingPscppData) return null;

  const canEdit = source === "supabase";

  const handleTopicUpdate = async (
    topic: ProgramTopic,
    patch: Partial<
      Pick<ProgramTopic, "studyStatus" | "importance" | "memorizationNeed" | "nextReview">
    >,
  ) => {
    const result = await updateTopic(topic.id, patch);
    if (result.ok) {
      toast.success("Tópico atualizado");
      return;
    }
    toast.error(result.message ?? "Não foi possível atualizar o tópico");
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 border-primary/40 text-primary">
            Etapa 1
          </Badge>
          <Badge variant="outline" className="mb-2 ml-2">
            {source === "supabase" ? "Supabase" : "Dados locais"}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">Conteúdo Programático</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Lista inicial dos assuntos que podem cair, com importância, memorização, materiais
            relacionados e revisão.
          </p>
          {source === "local" && (
            <p className="mt-2 max-w-2xl text-xs text-warning">
              Edição bloqueada até a migration PSCPP ser aplicada no Supabase.
            </p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link to="/">Voltar ao dashboard</Link>
        </Button>
      </div>

      <Card className="mb-4 shadow-none">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <Input
            placeholder="Buscar tópico"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select value={cluster} onValueChange={setCluster}>
            <SelectTrigger>
              <SelectValue placeholder="Cluster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clusters</SelectItem>
              {clusters.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {[
                "todos",
                "não iniciado",
                "iniciado",
                "estudado",
                "resumido",
                "revisado",
                "dominado",
              ].map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "todos" ? "Todos os status" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tópico</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Importância</TableHead>
                <TableHead>Memorização</TableHead>
                <TableHead>Questões</TableHead>
                <TableHead>Acerto</TableHead>
                <TableHead>Próxima revisão</TableHead>
                <TableHead>Materiais</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((topic) => {
                const clusterName =
                  clusters.find((item) => item.id === topic.clusterId)?.name ?? "—";
                const materials = topic.relatedMaterialIds
                  .map((id) => materials.find((material) => material.id === id)?.title)
                  .filter(Boolean)
                  .join("; ");
                return (
                  <TableRow key={topic.id}>
                    <TableCell className="min-w-[180px] font-medium">{topic.name}</TableCell>
                    <TableCell className="min-w-[220px] text-muted-foreground">
                      {clusterName}
                    </TableCell>
                    <TableCell>
                      <InlineSelect
                        value={topic.studyStatus}
                        values={[
                          "não iniciado",
                          "iniciado",
                          "estudado",
                          "resumido",
                          "revisado",
                          "dominado",
                        ]}
                        disabled={!canEdit}
                        onChange={(value) =>
                          handleTopicUpdate(topic, {
                            studyStatus: value as ProgramTopic["studyStatus"],
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <InlineSelect
                        value={topic.importance}
                        values={["baixa", "média", "alta", "altíssima"]}
                        disabled={!canEdit}
                        onChange={(value) =>
                          handleTopicUpdate(topic, { importance: value as PscppPriority })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <InlineSelect
                        value={topic.memorizationNeed}
                        values={["baixa", "média", "alta"]}
                        disabled={!canEdit}
                        onChange={(value) =>
                          handleTopicUpdate(topic, {
                            memorizationNeed: value as ProgramTopic["memorizationNeed"],
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>{topic.questionsDone}</TableCell>
                    <TableCell>{topic.accuracy ? `${topic.accuracy}%` : "—"}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input
                          className="h-8 min-w-[140px] text-xs"
                          type="date"
                          value={topic.nextReview ?? ""}
                          onChange={(event) =>
                            handleTopicUpdate(topic, { nextReview: event.target.value || null })
                          }
                        />
                      ) : (
                        (topic.nextReview ?? "—")
                      )}
                    </TableCell>
                    <TableCell className="min-w-[260px] text-muted-foreground">
                      {materials || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function InlineSelect({
  value,
  values,
  disabled,
  onChange,
}: {
  value: string;
  values: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (disabled) return <Badge variant="outline">{value}</Badge>;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 min-w-[120px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
