// Helpers for Garmin Sono CSV import
export const GARMIN_COLUMN_MAP: Record<string, string> = {
  "Sleep Score 7 dias": "date",
  "Pontuação": "sleep_score",
  "Frequência cardíaca em repouso": "resting_heart_rate",
  "Body Battery": "body_battery",
  "Respiração": "respiration",
  "Status de VFC": "hrv_status",
  "Qualidade": "sleep_quality",
  "Duração": "sleep_duration",
  "Necessidade de sono": "sleep_need",
  "Hora de dormir": "bedtime",
  "Hora de despertar": "wake_time",
};

export const REQUIRED_COLUMNS = Object.keys(GARMIN_COLUMN_MAP);

const MONTHS_PT: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

export function parseBrDate(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // dd/mm/yyyy or dd/mm/yy
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) {
    const [, d, mo, y] = m1;
    const yy = y.length === 2 ? 2000 + Number(y) : Number(y);
    return `${yy}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // dd de mês de yyyy / dd mês yyyy
  const m2 = s.toLowerCase().match(/^(\d{1,2})\s*(?:de\s+)?([a-zç]+)\.?\s*(?:de\s+)?(\d{2,4})?$/);
  if (m2) {
    const [, d, mon, y] = m2;
    const monNum = MONTHS_PT[mon.slice(0, 3)];
    if (monNum) {
      const yy = !y ? new Date().getFullYear() : y.length === 2 ? 2000 + Number(y) : Number(y);
      return `${yy}-${String(monNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  const t = Date.parse(s);
  if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

export function parseNumeric(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s || s === "--" || s === "-") return null;
  // extract first numeric token (handles "62 bpm", "85 %")
  const m = s.replace(/\./g, "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return isNaN(n) ? null : n;
}

export function parseDurationToHours(input: string | null | undefined): number | null {
  if (!input) return null;
  const s = String(input).toLowerCase();
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*min/);
  if (!h && !m) {
    // fallback hh:mm
    const c = s.match(/^(\d{1,2}):(\d{2})/);
    if (c) return Number(c[1]) + Number(c[2]) / 60;
    return null;
  }
  return (h ? Number(h[1]) : 0) + (m ? Number(m[1]) : 0) / 60;
}

export type GarminSleepRow = {
  date: string;
  sleep_score: number | null;
  resting_heart_rate: number | null;
  body_battery: number | null;
  respiration: number | null;
  hrv_status: string | null;
  sleep_quality: string | null;
  sleep_duration: string | null;
  sleep_need: string | null;
  bedtime: string | null;
  wake_time: string | null;
  raw_data: Record<string, unknown>;
};

export function mapRow(raw: Record<string, unknown>): GarminSleepRow | null {
  const dateRaw = String(raw["Sleep Score 7 dias"] ?? "").trim();
  const date = parseBrDate(dateRaw);
  if (!date) return null;
  const txt = (k: string) => {
    const v = raw[k];
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s && s !== "--" && s !== "-" ? s : null;
  };
  return {
    date,
    sleep_score: parseNumeric(raw["Pontuação"]),
    resting_heart_rate: parseNumeric(raw["Frequência cardíaca em repouso"]),
    body_battery: parseNumeric(raw["Body Battery"]),
    respiration: parseNumeric(raw["Respiração"]),
    hrv_status: txt("Status de VFC"),
    sleep_quality: txt("Qualidade"),
    sleep_duration: txt("Duração"),
    sleep_need: txt("Necessidade de sono"),
    bedtime: txt("Hora de dormir"),
    wake_time: txt("Hora de despertar"),
    raw_data: raw,
  };
}
