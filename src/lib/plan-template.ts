// Default weekly plan template (Mon=1 ... Sun=7)
export type PlanCategory = "PSCPP" | "Corpo" | "Vida";
export type PlanStatus = "pendente" | "feito" | "pulado" | "reagendado";

export const PLAN_STATUSES: PlanStatus[] = ["pendente", "feito", "pulado", "reagendado"];

export const DAY_LABEL: Record<number, string> = {
  1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado", 7: "Domingo",
};

export type PlanTemplateItem = { category: PlanCategory; day_of_week: number; title: string; detail?: string };

export const DEFAULT_PLAN: PlanTemplateItem[] = [
  // PSCPP
  { category: "PSCPP", day_of_week: 1, title: "Matemática", detail: "30 min" },
  { category: "PSCPP", day_of_week: 2, title: "Inglês", detail: "30 min" },
  { category: "PSCPP", day_of_week: 3, title: "Matemática", detail: "30 min" },
  { category: "PSCPP", day_of_week: 4, title: "Náutica", detail: "30 min" },
  { category: "PSCPP", day_of_week: 5, title: "Revisão", detail: "30 min" },
  // Corpo
  { category: "Corpo", day_of_week: 1, title: "Fortalecimento A" },
  { category: "Corpo", day_of_week: 3, title: "Corrida qualidade" },
  { category: "Corpo", day_of_week: 4, title: "Fortalecimento B" },
  { category: "Corpo", day_of_week: 5, title: "Corrida leve" },
  { category: "Corpo", day_of_week: 6, title: "Longão" },
  // Vida
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
