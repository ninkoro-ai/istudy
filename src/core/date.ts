export function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function todayStr(): string {
  return dateStr(0);
}

export function dateStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function addDays(date: string, days: number): string {
  const p = date.split('-');
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function daysBetween(a: string, b: string): number {
  const pa = a.split('-');
  const pb = b.split('-');
  const da = new Date(Number(pa[0]), Number(pa[1]) - 1, Number(pa[2]));
  const db = new Date(Number(pb[0]), Number(pb[1]) - 1, Number(pb[2]));
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function daysUntilExam(examDate: string): number {
  return Math.max(0, daysBetween(todayStr(), examDate));
}

export function phaseName(strategy: { plan: { defaultDays: number; phases: { name: string; ratio: number; desc: string }[] } }, start: string, today: string): string {
  const total = Math.max(1, daysBetween(start, today) + 1);
  const days = strategy.plan.defaultDays || 90;
  let acc = 0;
  for (const ph of strategy.plan.phases) {
    acc += ph.ratio * days;
    if (total <= Math.round(acc) || ph === strategy.plan.phases[strategy.plan.phases.length - 1]) return ph.name;
  }
  return strategy.plan.phases[0].name;
}
