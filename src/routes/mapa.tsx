import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePscppData } from "@/hooks/usePscppData";
import type { PscppPriority, PscppStatus, StudyCluster } from "@/types/pscpp";
import { toast } from "sonner";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa de Estudos — PSCPP" },
      { name: "description", content: "Mapa dos clusters e tópicos do PSCPP." },
    ],
  }),
  component: MapaPage,
});

function MapaPage() {
  const { user, loading } = useAuthGate();
  const { clusters, materials, loading: loadingPscppData, source, updateCluster } = usePscppData();
  if (loading || !user || loadingPscppData) return null;

  const canEdit = source === "supabase";

  const handleClusterUpdate = async (
    cluster: StudyCluster,
    patch: Partial<
      Pick<StudyCluster, "priority" | "status" | "progress" | "lastReview" | "nextReview">
    >,
  ) => {
    const result = await updateCluster(cluster.id, patch);
    if (result.ok) {
      toast.success("Cluster atualizado");
      return;
    }
    toast.error(result.message ?? "Não foi possível atualizar o cluster");
  };

  return (
    <AppShell>
      <Header
        title="Mapa de Estudos"
        description="Os 7 clusters principais com tópicos, materiais vinculados e próximas ações."
        source={source}
      />
      <div className="grid gap-4">
        {clusters.map((cluster) => {
          const clusterMaterials = materials
            .filter((material) => material.clusterIds.includes(cluster.id))
            .slice(0, 5);
          return (
            <Card key={cluster.id} className="shadow-none">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{cluster.name}</CardTitle>
                    <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                      {cluster.description}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <EditableSelect
                      label="Prioridade"
                      value={cluster.priority}
                      values={["baixa", "média", "alta", "altíssima"]}
                      disabled={!canEdit}
                      onChange={(value) =>
                        handleClusterUpdate(cluster, { priority: value as PscppPriority })
                      }
                    />
                    <EditableSelect
                      label="Status"
                      value={cluster.status}
                      values={[
                        "não iniciado",
                        "em andamento",
                        "em leitura",
                        "resumido",
                        "revisado",
                        "finalizado",
                        "confirmar",
                      ]}
                      disabled={!canEdit}
                      onChange={(value) =>
                        handleClusterUpdate(cluster, { status: value as PscppStatus })
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{cluster.progress}%</span>
                    </div>
                    <Progress value={cluster.progress} className="h-1.5" />
                  </div>
                  <EditableNumber
                    label="Ajustar progresso"
                    value={cluster.progress}
                    disabled={!canEdit}
                    onChange={(value) => handleClusterUpdate(cluster, { progress: value })}
                  />
                  <EditableDate
                    label="Próxima revisão"
                    value={cluster.nextReview}
                    disabled={!canEdit}
                    onChange={(value) => handleClusterUpdate(cluster, { nextReview: value })}
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                      Tópicos principais
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {cluster.topics.map((topic) => (
                        <Badge key={topic} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <InfoBlock
                      title="Materiais vinculados"
                      items={clusterMaterials.map((material) => material.title)}
                      empty="Nenhum material vinculado."
                    />
                    <InfoBlock title="Próximas ações" items={cluster.nextActions} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

function Header({
  title,
  description,
  source,
}: {
  title: string;
  description: string;
  source: "supabase" | "local";
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Badge variant="outline" className="mb-2 border-primary/40 text-primary">
          Etapa 1
        </Badge>
        <Badge variant="outline" className="mb-2 ml-2">
          {source === "supabase" ? "Supabase" : "Dados locais"}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
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
  );
}

function EditableSelect({
  label,
  value,
  values,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {disabled ? (
        <Badge variant="outline">{value}</Badge>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 min-w-[140px] text-xs">
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
      )}
    </div>
  );
}

function EditableNumber({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {disabled ? (
        <Badge variant="outline">{value}%</Badge>
      ) : (
        <Input
          className="h-8 text-xs"
          max={100}
          min={0}
          type="number"
          value={value}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            onChange(Math.min(100, Math.max(0, Number.isNaN(nextValue) ? 0 : nextValue)));
          }}
        />
      )}
    </div>
  );
}

function EditableDate({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {disabled ? (
        <Badge variant="outline">{value ?? "sem data"}</Badge>
      ) : (
        <Input
          className="h-8 text-xs"
          type="date"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
        />
      )}
    </div>
  );
}

function InfoBlock({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
      {items.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}
