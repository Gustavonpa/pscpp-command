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
import type { MaterialFileStatus, PscppPriority, PscppStatus, StudyMaterial } from "@/types/pscpp";
import { toast } from "sonner";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Materiais — PSCPP" },
      { name: "description", content: "Biblioteca filtrável de materiais PSCPP." },
    ],
  }),
  component: BibliotecaPage,
});

function BibliotecaPage() {
  const { user, loading } = useAuthGate();
  const { clusters, materials, loading: loadingPscppData, source, updateMaterial } = usePscppData();
  const [query, setQuery] = useState("");
  const [cluster, setCluster] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [priority, setPriority] = useState("todos");

  const rows = useMemo(() => {
    return materials.filter((material) => {
      const matchesQuery = material.title.toLowerCase().includes(query.toLowerCase());
      const matchesCluster = cluster === "todos" || material.clusterIds.includes(cluster);
      const matchesStatus = status === "todos" || material.status === status;
      const matchesPriority = priority === "todos" || material.priority === priority;
      return matchesQuery && matchesCluster && matchesStatus && matchesPriority;
    });
  }, [cluster, materials, priority, query, status]);

  if (loading || !user || loadingPscppData) return null;

  const canEdit = source === "supabase";

  const handleMaterialUpdate = async (
    material: StudyMaterial,
    patch: Partial<Pick<StudyMaterial, "priority" | "status" | "hasFile">>,
  ) => {
    const result = await updateMaterial(material.id, patch);
    if (result.ok) {
      toast.success("Material atualizado");
      return;
    }
    toast.error(result.message ?? "Não foi possível atualizar o material");
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
          <h1 className="text-2xl font-semibold tracking-tight">Biblioteca de Materiais</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Tabela inicial para saber o que você possui, o que precisa confirmar e onde cada
            material entra no edital.
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
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Input
            placeholder="Buscar material"
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
                "em andamento",
                "em leitura",
                "resumido",
                "revisado",
                "finalizado",
                "confirmar",
              ].map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "todos" ? "Todos os status" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              {["todos", "baixa", "média", "alta", "altíssima"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "todos" ? "Todas as prioridades" : item}
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
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Capítulos</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="min-w-[220px] font-medium">{material.title}</TableCell>
                  <TableCell>{material.type}</TableCell>
                  <TableCell className="min-w-[220px] text-muted-foreground">
                    {material.clusterIds
                      .map((id) => clusters.find((item) => item.id === id)?.name)
                      .filter(Boolean)
                      .join(" / ")}
                  </TableCell>
                  <TableCell>{material.chapters ?? "—"}</TableCell>
                  <TableCell>
                    <InlineSelect
                      value={material.priority}
                      values={["baixa", "média", "alta", "altíssima"]}
                      disabled={!canEdit}
                      onChange={(value) =>
                        handleMaterialUpdate(material, { priority: value as PscppPriority })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <InlineSelect
                      value={material.status}
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
                        handleMaterialUpdate(material, { status: value as PscppStatus })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <InlineSelect
                      value={material.hasFile}
                      values={["sim", "não", "confirmar"]}
                      disabled={!canEdit}
                      onChange={(value) =>
                        handleMaterialUpdate(material, { hasFile: value as MaterialFileStatus })
                      }
                    />
                  </TableCell>
                  <TableCell>{material.origin}</TableCell>
                </TableRow>
              ))}
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
