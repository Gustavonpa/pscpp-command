// Helpers for Garmin training/activities CSV import

// Map a CSV header (normalized) -> canonical db field name
type Field =
  | "activity_date" | "activity_time" | "activity_name" | "activity_type"
  | "duration_minutes" | "distance_km" | "average_pace" | "average_speed_kmh"
  | "average_heart_rate" | "max_heart_rate" | "calories"
  | "elevation_gain_meters" | "elevation_loss_meters"
  | "average_cadence" | "max_cadence"
  | "training_effect" | "aerobic_training_effect" | "anaerobic_training_effect"
  | "average_power" | "max_power";

const HEADER_MAP: Record<string, Field> = {};
const def = (field: Field, names: string[]) => {
  for (const n of names) HEADER_MAP[normalizeHeader(n)] = field;
};

function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

def("activity_date", ["Data", "Date", "Activity Date", "Data da atividade", "Início"]);
def("activity_time", ["Hora", "Time", "Start Time", "Horário", "Hora de início"]);
def("activity_name", ["Título", "Titulo", "Nome", "Activity Name", "Nome da atividade"]);
def("activity_type", ["Tipo", "Activity Type", "Tipo de atividade"]);
def("duration_minutes", ["Tempo", "Duração", "Duracao", "Duration", "Elapsed Time", "Moving Time", "Tempo total", "Tempo decorrido"]);
def("distance_km", ["Distância", "Distancia", "Distance"]);
def("average_pace", ["Ritmo médio", "Ritmo medio", "Average Pace", "Avg Pace", "Pace médio", "Pace medio", "Ritmo"]);
def("average_speed_kmh", ["Velocidade média", "Velocidade media", "Average Speed", "Avg Speed", "Velocidade"]);
def("average_heart_rate", ["FC média", "FC media", "Média de frequência cardíaca", "Media de frequencia cardiaca", "Average Heart Rate", "Avg HR", "FC Média"]);
def("max_heart_rate", ["FC máxima", "FC maxima", "Frequência cardíaca máxima", "Frequencia cardiaca maxima", "Max Heart Rate", "Max HR"]);
def("calories", ["Calorias", "Calories"]);
def("elevation_gain_meters", ["Ganho de elevação", "Ganho de elevacao", "Elevation Gain", "Subida acumulada", "Ganho total de elevação"]);
def("elevation_loss_meters", ["Perda de elevação", "Perda de elevacao", "Elevation Loss", "Descida acumulada"]);
def("average_cadence", ["Cadência média", "Cadencia media", "Average Cadence", "Avg Cadence"]);
def("max_cadence", ["Cadência máxima", "Cadencia maxima", "Max Cadence"]);
def("training_effect", ["Training Effect", "Efeito de treino"]);
def("aerobic_training_effect", ["Aerobic Training Effect", "Efeito aeróbico", "Efeito aerobico", "Aeróbico", "Aerobico"]);
def("anaerobic_training_effect", ["Anaerobic Training Effect", "Efeito anaeróbico", "Efeito anaerobico", "Anaeróbico", "Anaerobico"]);
def("average_power", ["Potência média", "Potencia media", "Average Power", "Avg Power"]);
def("max_power", ["Potência máxima", "Potencia maxima", "Max Power"]);

export function detectFields(headers: string[]): { found: Partial<Record<Field, string>>; unmapped: string[] } {
  const found: Partial<Record<Field, string>> = {};
  const unmapped: string[] = [];
  for (const h of headers) {
    const f = HEADER_MAP[normalizeHeader(h)];
    if (f && !found[f]) found[f] = h;
    else if (!f) unmapped.push(h);
  }
  return { found, unmapped };
}

export const REQUIRED_TRAINING_FIELDS: Field[] = ["activity_date", "activity_type", "duration_minutes"];

export function parseDate(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy hh:mm or dd/mm/yyyy
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? 2000 + Number(y) : Number(y);
    return `${yy}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const t = Date.parse(s);
  if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

export function combineDateTime(dateStr: string | null, timeStr: string | null): string | null {
  if (!dateStr) return null;
  if (!timeStr) {
    // maybe date itself contains time
    const t = Date.parse(dateStr);
    return isNaN(t) ? null : new Date(t).toISOString();
  }
  const d = parseDate(dateStr);
  if (!d) return null;
  const tm = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const hh = tm ? tm[1].padStart(2, "0") : "00";
  const mm = tm ? tm[2] : "00";
  const ss = tm && tm[3] ? tm[3] : "00";
  // Brazil timezone-naive; store as ISO without TZ shift (UTC equivalent)
  const iso = `${d}T${hh}:${mm}:${ss}`;
  const t = Date.parse(iso);
  return isNaN(t) ? null : new Date(t).toISOString();
}

export function parseNum(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s || s === "--" || s === "-") return null;
  const m = s.replace(/\./g, "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return isNaN(n) ? null : n;
}

// Convert to minutes. Handles "1:05:30", "45:30" (mm:ss), "65 min", "1h 05m", numeric (assumed minutes)
export function parseDurationMinutes(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s || s === "--" || s === "-") return null;
  const colon = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    const a = Number(colon[1]); const b = Number(colon[2]); const c = colon[3] ? Number(colon[3]) : null;
    if (c !== null) return a * 60 + b + c / 60; // hh:mm:ss
    return a + b / 60; // mm:ss
  }
  const h = s.toLowerCase().match(/(\d+)\s*h/);
  const m = s.toLowerCase().match(/(\d+)\s*m(?!s)/);
  const sec = s.toLowerCase().match(/(\d+)\s*s/);
  if (h || m || sec) return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0) + (sec ? Number(sec[1]) / 60 : 0);
  const n = parseNum(s);
  return n;
}

export function parseDistanceKm(input: unknown): number | null {
  // Backwards-compat shim: delegate to normalizeDistanceToKm without context.
  return normalizeDistanceToKm(input, {}, "distance");
}

/**
 * Robust distance parser that always returns kilometers.
 * - Handles Brazilian comma decimals ("6,00" -> 6.00)
 * - Handles dot decimals ("6.00" -> 6.00, "10.01" -> 10.01)
 * - Handles thousands+decimal mixes ("1.234,5" -> 1234.5)
 * - Strips unit text (km, m, meters, quilômetros)
 * - Detects meters via column name or unit text in value
 * - For running activities, divides absurdly high values (>100) by 100
 * - For running activities named "12 K"/"12K" with abnormally low value, scales up
 */
export function normalizeDistanceToKm(
  value: unknown,
  rawRow: Record<string, unknown> = {},
  columnName: string = "",
): number | null {
  if (value === null || value === undefined) return null;
  const original = String(value).trim();
  if (!original || original === "--" || original === "-") return null;

  const lower = original.toLowerCase();
  const hasMeterUnit = /(\bm\b|\bmeters?\b|\bmetros?\b)/.test(lower) && !/km|quil/.test(lower);
  const hasKmUnit = /(km|quil)/.test(lower);
  const colLower = columnName.toLowerCase();
  const colSaysMeters = /(metro|meters|\bm\b)/.test(colLower) && !/km|quil/.test(colLower);

  // Strip unit text
  let s = lower
    .replace(/quil[oô]metros?/g, "")
    .replace(/meters?/g, "")
    .replace(/metros?/g, "")
    .replace(/km/g, "")
    .replace(/\bm\b/g, "")
    .trim();

  // Decimal separator handling
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    // Comma is decimal, dot is thousands → "1.234,5" => 1234.5
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Comma as decimal → "6,00" => "6.00"
    s = s.replace(",", ".");
  }
  // If only dot or only digits: keep as-is (dot is decimal).

  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  let n = Number(m[0]);
  if (isNaN(n)) return null;

  // Convert meters to km when explicitly indicated
  if (hasMeterUnit || colSaysMeters) n = n / 1000;

  // Activity context for heuristics
  const activityType = String(rawRow["activity_type"] ?? rawRow["Tipo"] ?? rawRow["Activity Type"] ?? "").toLowerCase();
  const activityName = String(rawRow["activity_name"] ?? rawRow["Título"] ?? rawRow["Titulo"] ?? rawRow["Nome"] ?? "").toLowerCase();
  const isRunning = /(running|\brun\b|corrida|trail)/.test(activityType) || /corrida/.test(activityName);

  // Absurdly high for a running activity → likely scaled by 100 (e.g. 600 → 6.00)
  if (isRunning && n > 100 && n < 100000) {
    n = n / 100;
  }

  // Inverse: name suggests "N K"/"N km" but stored value far below → scale up
  if (isRunning && n > 0 && n < 5) {
    const nameKm = activityName.match(/(\d{1,2}(?:[.,]\d)?)\s*k(?:m)?\b/);
    if (nameKm) {
      const expected = Number(nameKm[1].replace(",", "."));
      if (expected >= 5 && Math.abs(n * 10 - expected) < 1.5) {
        n = n * 10;
      }
    }
  }

  return n;
}

export type DistanceNormalization = {
  km: number | null;
  original: string | null;
  corrected: boolean;
  warning: string | null;
};

export function normalizeDistanceWithMeta(
  value: unknown,
  rawRow: Record<string, unknown> = {},
  columnName: string = "",
): DistanceNormalization {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { km: null, original: null, corrected: false, warning: null };
  }
  const original = String(value).trim();
  const km = normalizeDistanceToKm(value, rawRow, columnName);
  // Naive "as-typed" parse for comparison
  const naive = (() => {
    const s = original.toLowerCase().replace(",", ".").replace(/[^0-9.]/g, "");
    const n = Number(s);
    return isNaN(n) ? null : n;
  })();
  const corrected = km !== null && naive !== null && Math.abs(km - naive) > 0.01;

  let warning: string | null = null;
  const activityName = String(rawRow["activity_name"] ?? rawRow["Título"] ?? rawRow["Titulo"] ?? rawRow["Nome"] ?? "");
  const nameKm = activityName.toLowerCase().match(/(\d{1,2}(?:[.,]\d)?)\s*k(?:m)?\b/);
  if (km !== null && nameKm) {
    const expected = Number(nameKm[1].replace(",", "."));
    if (expected >= 3 && Math.abs(km - expected) > Math.max(2, expected * 0.3)) {
      warning = `Possível inconsistência: nome indica ${expected} km, mas distância importada é ${km.toFixed(2)} km.`;
    }
  }
  return { km, original, corrected, warning };
}

export type TrainingRow = {
  activity_date: string;
  activity_datetime: string | null;
  activity_name: string | null;
  activity_type: string | null;
  duration_minutes: number | null;
  distance_km: number | null;
  average_pace: string | null;
  average_speed_kmh: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  elevation_gain_meters: number | null;
  elevation_loss_meters: number | null;
  average_cadence: number | null;
  max_cadence: number | null;
  training_effect: number | null;
  aerobic_training_effect: number | null;
  anaerobic_training_effect: number | null;
  average_power: number | null;
  max_power: number | null;
  raw_data: Record<string, unknown>;
};

export function mapTrainingRow(raw: Record<string, unknown>, headers: Partial<Record<Field, string>>): TrainingRow | null {
  const get = (f: Field): string | null => {
    const h = headers[f];
    if (!h) return null;
    const v = raw[h];
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s && s !== "--" && s !== "-" ? s : null;
  };
  const dateRaw = get("activity_date");
  const date = dateRaw ? parseDate(dateRaw) : null;
  if (!date) return null;
  const timeRaw = get("activity_time");
  const activity_name = get("activity_name");
  const activity_type = get("activity_type");
  const distanceCol = headers["distance_km"] ?? "distance";
  const distanceRaw = get("distance_km");
  const distanceCtx = { ...raw, activity_name, activity_type };
  return {
    activity_date: date,
    activity_datetime: combineDateTime(dateRaw, timeRaw),
    activity_name,
    activity_type,
    duration_minutes: parseDurationMinutes(get("duration_minutes")),
    distance_km: normalizeDistanceToKm(distanceRaw, distanceCtx, distanceCol),
    average_pace: get("average_pace"),
    average_speed_kmh: parseNum(get("average_speed_kmh")),
    average_heart_rate: parseNum(get("average_heart_rate")),
    max_heart_rate: parseNum(get("max_heart_rate")),
    calories: parseNum(get("calories")),
    elevation_gain_meters: parseNum(get("elevation_gain_meters")),
    elevation_loss_meters: parseNum(get("elevation_loss_meters")),
    average_cadence: parseNum(get("average_cadence")),
    max_cadence: parseNum(get("max_cadence")),
    training_effect: parseNum(get("training_effect")),
    aerobic_training_effect: parseNum(get("aerobic_training_effect")),
    anaerobic_training_effect: parseNum(get("anaerobic_training_effect")),
    average_power: parseNum(get("average_power")),
    max_power: parseNum(get("max_power")),
    raw_data: { ...raw, _original_distance: distanceRaw, _distance_column: distanceCol },
  };
}

export type TrainingCategory = "corrida" | "fortalecimento" | "caminhada" | "outros";

export function classifyTraining(activityType: string | null | undefined): TrainingCategory {
  const s = (activityType ?? "").toLowerCase();
  if (/(running|\brun\b|corrida|trail)/.test(s)) return "corrida";
  if (/(strength|musculacao|musculação|funcional|weight)/.test(s)) return "fortalecimento";
  if (/(walking|caminhada|\bwalk\b)/.test(s)) return "caminhada";
  return "outros";
}

// pace mm:ss/km string -> seconds per km
export function paceToSeconds(pace: string | null | undefined): number | null {
  if (!pace) return null;
  const m = String(pace).match(/(\d+):(\d{1,2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function secondsToPace(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}
