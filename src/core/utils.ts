export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function uid(prefix = 'id'): string {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
