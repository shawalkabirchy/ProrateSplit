const DAY_MS = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function dayNumber(value: string): number {
  if (!isCalendarDate(value))
    throw new Error("Enter a real calendar date in YYYY-MM-DD format.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime() / DAY_MS;
}

export function dayString(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function dateLabel(value: string): string {
  return dateFormatter.format(new Date(dayNumber(value) * DAY_MS));
}

export function periodLabel(startOn: string, endOn: string): string {
  return `${dateLabel(startOn)} – ${dateLabel(dayString(dayNumber(endOn) - 1))}`;
}
