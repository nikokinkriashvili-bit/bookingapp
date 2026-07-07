export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toTimeString(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function parseDateAndTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export function addMinutesToDateTime(
  dateStr: string,
  timeStr: string,
  minutesToAdd: number
): { date: string; time: string } | null {
  const start = parseDateAndTime(dateStr, timeStr);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + minutesToAdd * 60000);
  return { date: toDateKey(end), time: toTimeString(end) };
}
