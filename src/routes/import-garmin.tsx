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
import {
  detectFields, mapTrainingRow, REQUIRED_TRAINING_FIELDS, classifyTraining,
  normalizeDistanceWithMeta, formatDisplayDistance,
  type TrainingRow,
} from "@/lib/garmin-training";

export const Route = createFileRoute("/import-garmin")({
  head: () => ({ meta: [{ title: "Importar Garmin CSV — PSCPP" }, { name: "description", content: "Importe dados de sono e treinos do Garmin via CSV." }] }),
  component: ImportGarmin,
});

function ImportGarmin() {
  const { user, loading } = useAuthGate();
  if (loading || !user) return null;
  return (
    <AppShell>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importar Garmin CSV</h1>
          <p className="text-sm text-muted-foreground">Sono, recuperação e treinos · arquivos exportados do Garmin Connect</p>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/">Voltar</Link></Button>
      </div>

      <SleepImporter userId={user.id} />
      <div className="h-5" />
      <TrainingImporter userId={user.id} />

      <Card className="mt-5">
        <CardHeader><CardTitle className="text-base">Mapeamento de colunas (sono)</CardTitle></CardHeader>
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

function SleepImporter({ userId }: { userId: string }) {
  const [rows, setRows] = useState<GarminSleepRow[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [skipped, setSkipped] = useState(0);

  const onFile = (file: File) => {
    setFileName(file.name); setRows([]); setMissing([]); setSkipped(0);
    Papa.parse<Record<string, unknown>>(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const fields = res.meta.fields ?? [];
        const miss = REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
        setMissing(miss);
        if (miss.length) return toast.error(`Colunas faltando: ${miss.length}`);
        const mapped: GarminSleepRow[] = []; let skip = 0;
        for (const r of res.data) { const m = mapRow(r); if (m) mapped.push(m); else skip++; }
        setRows(mapped); setSkipped(skip);
        toast.success(`${mapped.length} linhas prontas para importar`);
      },
      error: (err) => toast.error(err.message),
    });
  };

  const doImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    const payload = rows.map((r) => ({ ...r, raw_data: r.raw_data as never, user_id: userId }));
    const { error } = await supabase.from("garmin_sleep_metrics").upsert(payload, { onConflict: "user_id,date" });
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Importado: ${rows.length} registros`);
    setRows([]); setFileName("");
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Importar dados de sono</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} className="max-w-sm" />
          {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
        </div>
        <div className="text-xs text-muted-foreground">Colunas esperadas: {REQUIRED_COLUMNS.join(" · ")}</div>
        {missing.length > 0 && (
          <Alert className="border-destructive/40 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm">Colunas ausentes no CSV: <b>{missing.join(", ")}</b></AlertDescription>
          </Alert>
        )}
        {rows.length > 0 && (
          <>
            <Alert className="border-success/40 bg-success/5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-sm">
                {rows.length} linhas válidas{skipped ? ` · ${skipped} ignoradas (data inválida)` : ""}. Datas existentes serão atualizadas.
              </AlertDescription>
            </Alert>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground"><tr>
                  <th className="text-left p-2">Data</th><th className="text-right p-2">Score</th><th className="text-right p-2">FC rep.</th>
                  <th className="text-right p-2">Body Bat.</th><th className="text-left p-2">VFC</th><th className="text-left p-2">Duração</th>
                </tr></thead>
                <tbody>
                  {rows.slice(0, 15).map((r) => (
                    <tr key={r.date} className="border-t border-border">
                      <td className="p-2 font-medium">{r.date}</td>
                      <td className="p-2 text-right">{r.sleep_score ?? "—"}</td>
                      <td className="p-2 text-right">{r.resting_heart_rate ?? "—"}</td>
                      <td className="p-2 text-right">{r.body_battery ?? "—"}</td>
                      <td className="p-2">{r.hrv_status ?? "—"}</td>
                      <td className="p-2">{r.sleep_duration ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 15 && <div className="p-2 text-center text-xs text-muted-foreground border-t border-border">+ {rows.length - 15} linhas</div>}
            </div>
            <Button onClick={doImport} disabled={importing}>
              <Upload className="h-4 w-4 mr-1" />{importing ? "Importando…" : `Importar ${rows.length} registros`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TrainingImporter({ userId }: { userId: string }) {
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [headersFound, setHeadersFound] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [skipped, setSkipped] = useState(0);

  const onFile = (file: File) => {
    setFileName(file.name); setRows([]); setMissing([]); setUnmapped([]); setHeadersFound([]); setSkipped(0);
    Papa.parse<Record<string, unknown>>(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const { found, unmapped } = detectFields(headers);
        const miss = REQUIRED_TRAINING_FIELDS.filter((f) => !found[f]);
        setMissing(miss.map(String));
        setUnmapped(unmapped);
        setHeadersFound(Object.entries(found).map(([k, v]) => `${k} ← ${v}`));
        if (miss.length) return toast.error(`Campos obrigatórios não detectados: ${miss.join(", ")}`);
        const mapped: TrainingRow[] = []; let skip = 0;
        for (const r of res.data) { const m = mapTrainingRow(r, found); if (m) mapped.push(m); else skip++; }
        setRows(mapped); setSkipped(skip);
        toast.success(`${mapped.length} treinos prontos para importar`);
      },
      error: (err) => toast.error(err.message),
    });
  };

  const doImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    const payload = rows.map((r) => ({ ...r, raw_data: r.raw_data as never, user_id: userId, source: "garmin_csv" }));
    // Use unique index (user_id, activity_date, COALESCE(activity_type), COALESCE(duration_minutes))
    // Postgres upsert needs explicit column list; emulate per-row to be safe with COALESCE-based index.
    let ok = 0; let fail = 0;
    for (const row of payload) {
      const { data: existing } = await supabase
        .from("garmin_training_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("activity_date", row.activity_date)
        .eq("activity_type", row.activity_type ?? "")
        .eq("duration_minutes", row.duration_minutes ?? -1)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from("garmin_training_sessions").update(row).eq("id", existing.id);
        if (error) fail++; else ok++;
      } else {
        const { error } = await supabase.from("garmin_training_sessions").insert(row);
        if (error) fail++; else ok++;
      }
    }
    setImporting(false);
    if (fail) toast.error(`${fail} falharam · ${ok} importados`);
    else toast.success(`Importado: ${ok} treinos`);
    setRows([]); setFileName("");
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Importar treinos Garmin</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} className="max-w-sm" />
          {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
        </div>
        <div className="text-xs text-muted-foreground">
          Obrigatórios: data · tipo · duração. Outros campos (distância, FC, calorias, elevação, cadência, training effect, potência) são detectados automaticamente.
        </div>

        {missing.length > 0 && (
          <Alert className="border-destructive/40 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm">Campos obrigatórios ausentes: <b>{missing.join(", ")}</b></AlertDescription>
          </Alert>
        )}

        {headersFound.length > 0 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Mapeamento detectado ({headersFound.length})</summary>
            <ul className="mt-1 space-y-0.5">
              {headersFound.map((h) => <li key={h}><code>{h}</code></li>)}
            </ul>
            {unmapped.length > 0 && (
              <div className="mt-2">Colunas não mapeadas (serão salvas em raw_data): {unmapped.join(", ")}</div>
            )}
          </details>
        )}

        {rows.length > 0 && (
          <>
            <Alert className="border-success/40 bg-success/5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-sm">
                {rows.length} treinos válidos{skipped ? ` · ${skipped} ignorados` : ""}. Treinos existentes (mesma data + tipo + duração) serão atualizados.
              </AlertDescription>
            </Alert>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground"><tr>
                  <th className="text-left p-2">Data</th><th className="text-left p-2">Tipo</th><th className="text-left p-2">Categoria</th>
                  <th className="text-right p-2">Dur (min)</th>
                  <th className="text-right p-2">Dist orig.</th>
                  <th className="text-right p-2">Dist (km)</th>
                  <th className="text-left p-2">Alerta</th>
                  <th className="text-right p-2">FC méd</th><th className="text-right p-2">Cal</th>
                </tr></thead>
                <tbody>
                  {rows.slice(0, 15).map((r, i) => {
                    const meta = normalizeDistanceWithMeta(
                      (r.raw_data as Record<string, unknown>)?._original_distance,
                      { ...(r.raw_data as Record<string, unknown>), activity_name: r.activity_name, activity_type: r.activity_type },
                      String((r.raw_data as Record<string, unknown>)?._distance_column ?? "distance"),
                    );
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2 font-medium">{r.activity_date}</td>
                        <td className="p-2">{r.activity_type ?? "—"}</td>
                        <td className="p-2 text-primary">{classifyTraining(r.activity_type)}</td>
                        <td className="p-2 text-right">{r.duration_minutes?.toFixed(1) ?? "—"}</td>
                        <td className="p-2 text-right text-muted-foreground">{meta.original ?? "—"}</td>
                        <td className={`p-2 text-right ${meta.corrected ? "text-amber-500 font-medium" : ""}`}>
                          {r.distance_km != null ? `${r.distance_km.toFixed(2)} km` : "—"}
                        </td>
                        <td className="p-2 text-xs">
                          {meta.warning ? <span className="text-destructive">{meta.warning}</span>
                            : meta.corrected ? <span className="text-amber-500">Correção automática aplicada</span>
                            : ""}
                        </td>
                        <td className="p-2 text-right">{r.average_heart_rate ?? "—"}</td>
                        <td className="p-2 text-right">{r.calories ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length > 15 && <div className="p-2 text-center text-xs text-muted-foreground border-t border-border">+ {rows.length - 15} linhas</div>}
            </div>
            <Button onClick={doImport} disabled={importing}>
              <Upload className="h-4 w-4 mr-1" />{importing ? "Importando…" : `Importar ${rows.length} treinos`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
