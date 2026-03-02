/** Returns today's local date as "YYYY-MM-DD" (uses the user's system timezone). */
export function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns today's local date as "YYYY-MM-DD". */
export function defaultStart(): string {
  return localToday();
}

/** Returns tomorrow's local date as "YYYY-MM-DD". */
export function defaultEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Converts a UTC ISO string back to the user's local "YYYY-MM-DD".
 * Use this whenever you need to display an ISO string in a date input.
 * (The inverse of dateToStartISO / dateToEndISO.)
 */
export function isoToLocalDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Converts a date string "YYYY-MM-DD" to a local-time ISO start-of-day string. */
export function dateToStartISO(date: string): string {
  return new Date(date + 'T00:00').toISOString();
}

/** Converts a date string "YYYY-MM-DD" to a local-time ISO end-of-day string. */
export function dateToEndISO(date: string): string {
  return new Date(date + 'T23:59').toISOString();
}

/** Returns true when start <= end (both "YYYY-MM-DD"). */
export function isValidDateRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  return start <= end;
}

/** Returns true when the start date is before today in the user's local timezone. */
export function isStartInPast(start: string): boolean {
  if (!start) return false;
  return start < localToday();
}

/** Formats a date range for display: "Mon 3 Mar → Tue 4 Mar". */
export function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return start === end ? fmt(start) : `${fmt(start)} → ${fmt(end)}`;
}

/**
 * Formats a UTC ISO string in a specific IANA timezone.
 * Falls back to the user's local timezone if the timezone is unknown.
 */
export function formatInTimezone(isoString: string, timezone: string, opts: Intl.DateTimeFormatOptions = {}): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...opts,
    }).format(new Date(isoString));
  } catch {
    return new Date(isoString).toLocaleString();
  }
}

/**
 * Returns a short UTC-offset label for an IANA timezone, e.g. "UTC+1" or "GMT-5".
 * Falls back to the raw timezone string if Intl is unavailable.
 */
export function timezoneOffsetLabel(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone;
  } catch {
    return timezone;
  }
}
