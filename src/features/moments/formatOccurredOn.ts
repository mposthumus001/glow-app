const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Hydration-stable occurred-on labels.
 * Avoids toLocaleDateString(undefined) which differs between Node and the browser.
 */
export function formatOccurredOnShort(value: string): string {
  const parts = parseOccurredOn(value);
  if (!parts) return value;
  return `${parts.day} ${SHORT_MONTHS[parts.monthIndex]} ${parts.year}`;
}

export function formatOccurredOnLong(value: string): string {
  const parts = parseOccurredOn(value);
  if (!parts) return value;
  const weekday = WEEKDAYS[parts.weekdayIndex];
  return `${weekday}, ${parts.day} ${LONG_MONTHS[parts.monthIndex]} ${parts.year}`;
}

function parseOccurredOn(value: string): {
  year: number;
  monthIndex: number;
  day: number;
  weekdayIndex: number;
} | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    return null;
  }
  return {
    year: y,
    monthIndex: m - 1,
    day: d,
    weekdayIndex: utc.getUTCDay(),
  };
}
