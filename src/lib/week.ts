export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 sun
  const diff = day === 0 ? -6 : 1 - day; // monday start
  date.setDate(date.getDate() + diff);
  return date;
}

export function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function fmtWeekLabel(d: Date): string {
  const s = startOfWeek(d);
  const e = endOfWeek(d);
  const fmt = (x: Date) =>
    x.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(s)} – ${fmt(e)}`;
}
