import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePscppData } from "@/hooks/usePscppData";

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
  const { clusters, materials, loading: loadingPscppData, source } = usePscppData();
  if (loading || !user || loadingPscppData) return null;

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
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{cluster.priority}</Badge>
                    <Badge variant="outline">{cluster.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{cluster.progress}%</span>
                  </div>
                  <Progress value={cluster.progress} className="h-1.5" />
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
      </div>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao dashboard</Link>
      </Button>
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
