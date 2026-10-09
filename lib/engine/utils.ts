/**
 * Shared pure helpers for the deterministic recommendation engines.
 */

export function daysBetween(start: Date | string, end: Date | string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diff = endMs - startMs;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function hoursBetween(start: Date | string, end: Date | string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diff = endMs - startMs;
  return diff / (1000 * 60 * 60);
}

export function minutesBetween(start: Date | string, end: Date | string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Math.round((endMs - startMs) / (1000 * 60));
}

export function toISODate(date: Date | string): string {
  return new Date(date).toISOString().split("T")[0];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function addDays(date: Date | string, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getDayOfWeek(date: Date | string): number {
  return new Date(date).getDay();
}

export function getUTCDayOfWeek(date: Date | string): number {
  return new Date(date).getUTCDay();
}

export function toUTCISODate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function utcTimeString(date: Date | string): string {
  const d = new Date(date);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * Parse a time string (HH:mm or HH:mm:ss) and apply it to a reference date in UTC.
 */
export function applyUTCTime(date: Date | string, time: string): Date {
  const [hours, minutes] = time.split(":").map((part) => parseInt(part, 10));
  const result = new Date(date);
  result.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}

/**
 * Parse a time string (HH:mm or HH:mm:ss) and apply it to a reference date.
 */
export function applyTime(date: Date | string, time: string): Date {
  const [hours, minutes] = time.split(":").map((part) => parseInt(part, 10));
  const result = new Date(date);
  result.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}
