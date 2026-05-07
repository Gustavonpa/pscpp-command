import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import Papa from "papaparse";
import { AppShell } from "@/components/AppShell";
import { useAuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { GARMIN_COLUMN_MAP, REQUIRED_COLUMNS, mapRow, type GarminSleepRow } from "@/lib/garmin";

export const Route = createFileRoute("/import-garmin")({
  head: () => ({ meta: [{ title: "Importar Garmin CSV — PSCPP" }, { name: "description", content: "Importe dados de sono do Garmin via CSV." }] }),
  component: ImportGarmin,
});

function ImportGarmin() {
  const { user, loading } = useAuthGate();
  const [rows, setRows] = useState<GarminSleepRow[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [skipped, setSkipped] = useState(0);

  if (loading || !user) return null;

  const onFile = (file: File) => {
    setFileName(file.name);
    setRows([]);
    setMissing([]);
    setSkipped(0);
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const fields = res.meta.fields ?? [];
        const miss = REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
        setMissing(miss);
        if (miss.length) {
          toast.error(`Colunas faltando: ${miss.length}`);
          return;
        }
        const mapped: GarminSleepRow[] = [];
        let skip = 0;
        for (const r of res.data) {
          const m = mapRow(r);
          if (m) mapped.push(m); else skip++;
        }
        setRows(mapped);
        setSkipped(skip);
        toast.success(`${mapped.length} linhas prontas para importar`);
      },
      error: (err) => toast.error(err.message),
    });
  };

  const doImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    const payload = rows.map((r) => ({ ...r, user_id: user.id }));
    const { error } = await supabase
      .from("garmin_sleep_metrics")
      .upsert(payload, { onConflict: "user_id,date" });
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Importado: ${rows.length} registros`);
    setRows([]);
    setFileName("");
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importar Garmin CSV</h1>
          <p className="text-sm text-muted-foreground">Sono e recuperação · arquivo exportado do Garmin Connect</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/">Voltar</Link></Button>
      </div>

      <Card className="mb-5">
        <CardHeader><CardTitle className="text-base">Importar dados de sono</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
              className="max-w-sm"
            />
            {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
          </div>

          <div className="text-xs text-muted-foreground">
            Colunas esperadas: {REQUIRED_COLUMNS.join(" · ")}
          </div>

          {missing.length > 0 && (
            <Alert className="border-destructive/40 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                Colunas ausentes no CSV: <b>{missing.join(", ")}</b>
              </AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <>
              <Alert className="border-success/40 bg-success/5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-sm">
                  {rows.length} linhas válidas{skipped ? ` · ${skipped} ignoradas (data inválida)` : ""}. Datas existentes serão atualizadas (upsert).
                </AlertDescription>
              </Alert>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Data</th>
                      <th className="text-right p-2">Score</th>
                      <th className="text-right p-2">FC rep.</th>
                      <th className="text-right p-2">Body Bat.</th>
                      <th className="text-right p-2">Resp.</th>
                      <th className="text-left p-2">VFC</th>
                      <th className="text-left p-2">Qualidade</th>
                      <th className="text-left p-2">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r) => (
                      <tr key={r.date} className="border-t border-border">
                        <td className="p-2 font-medium">{r.date}</td>
                        <td className="p-2 text-right">{r.sleep_score ?? "—"}</td>
                        <td className="p-2 text-right">{r.resting_heart_rate ?? "—"}</td>
                        <td className="p-2 text-right">{r.body_battery ?? "—"}</td>
                        <td className="p-2 text-right">{r.respiration ?? "—"}</td>
                        <td className="p-2">{r.hrv_status ?? "—"}</td>
                        <td className="p-2">{r.sleep_quality ?? "—"}</td>
                        <td className="p-2">{r.sleep_duration ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <div className="p-2 text-center text-xs text-muted-foreground border-t border-border">
                    + {rows.length - 20} linhas
                  </div>
                )}
              </div>
              <Button onClick={doImport} disabled={importing}>
                <Upload className="h-4 w-4 mr-1" />
                {importing ? "Importando…" : `Importar ${rows.length} registros`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mapeamento de colunas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-1 text-xs">
            {Object.entries(GARMIN_COLUMN_MAP).map(([csv, db]) => (
              <div key={csv} className="flex items-center justify-between border-b border-border/50 py-1">
                <span className="text-muted-foreground">{csv}</span>
                <code className="text-primary">{db}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
