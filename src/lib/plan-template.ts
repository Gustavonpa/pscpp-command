// Default weekly plan template (Mon=1 ... Sun=7)
export type PlanCategory = "PSCPP" | "Corpo" | "Vida";
export type PlanStatus = "pendente" | "feito" | "pulado" | "reagendado";

export const PLAN_STATUSES: PlanStatus[] = ["pendente", "feito", "pulado", "reagendado"];

export const DAY_LABEL: Record<number, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
  7: "Domingo",
};

export type PlanTemplateItem = {
  category: PlanCategory;
  day_of_week: number;
  title: string;
  detail?: string;
  // duration in minutes — used when auto-creating a study/training record
  duration_min?: number;
};

export const DEFAULT_PLAN: PlanTemplateItem[] = [
  // PSCPP — 5 blocos
  {
    category: "PSCPP",
    day_of_week: 1,
    title: "Manobrabilidade do Navio",
    detail: "Squat e águas rasas · 40 min",
    duration_min: 40,
  },
  {
    category: "PSCPP",
    day_of_week: 2,
    title: "Navegação em Águas Restritas",
    detail: "Passage planning · 40 min",
    duration_min: 40,
  },
  {
    category: "PSCPP",
    day_of_week: 3,
    title: "Legislação e Regulamentação",
    detail: "NORMAMs / RIPEAM · 40 min",
    duration_min: 40,
  },
  {
    category: "PSCPP",
    day_of_week: 4,
    title: "Arte Naval",
    detail: "Rebocadores e amarração · 40 min",
    duration_min: 40,
  },
  {
    category: "PSCPP",
    day_of_week: 5,
    title: "Revisão PSCPP",
    detail: "Consolidar 5 bullets da semana · 30 min",
    duration_min: 30,
  },
  // Corpo — 5 treinos
  { category: "Corpo", day_of_week: 1, title: "Fortalecimento A", duration_min: 45 },
  { category: "Corpo", day_of_week: 3, title: "Corrida qualidade", duration_min: 40 },
  { category: "Corpo", day_of_week: 4, title: "Fortalecimento B", duration_min: 45 },
  { category: "Corpo", day_of_week: 5, title: "Corrida leve", duration_min: 35 },
  { category: "Corpo", day_of_week: 6, title: "Longão", duration_min: 75 },
  // Vida — 3
  { category: "Vida", day_of_week: 2, title: "Maçonaria", detail: "20h" },
  { category: "Vida", day_of_week: 7, title: "Planejamento semanal" },
  { category: "Vida", day_of_week: 7, title: "Preparar jantas/marmitas" },
];

// Half marathon target date: 12/07/2026
export const MEIA_POA_DATE = new Date("2026-07-12T00:00:00");

export function weeksUntil(target: Date, from: Date = new Date()): number {
  const ms = target.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)));
}

// Projeto Piloto Maio/2026 — metas semanais
export const PILOTO_GOALS = {
  studyBlocks: 5,
  studyHoursMin: 3,
  studyHoursMax: 4,
  trainingsTotal: 5, // 2 corridas + 1 fortalecimento + 1 longão + 1 extra (corrida leve)
  runs: 2,
  strength: 1,
  longRun: 1,
  wakeOnTime: 4,
  meals: 4,
} as const;

// Per-category target counts shown on the Plan page
export const PLAN_CATEGORY_TARGET: Record<PlanCategory, number> = {
  PSCPP: 5,
  Corpo: 5,
  Vida: 3,
};

// Stage of week based on weekday (1=Mon..7=Sun) — used for non-punitive status
export type WeekStage = "inicio" | "meio" | "fim";
export function weekStage(d: Date = new Date()): WeekStage {
  const dow = d.getDay(); // 0=Sun..6=Sat
  const iso = dow === 0 ? 7 : dow; // 1..7
  if (iso <= 2) return "inicio"; // Seg/Ter
  if (iso <= 4) return "meio"; // Qua/Qui
  return "fim"; // Sex/Sab/Dom
}
