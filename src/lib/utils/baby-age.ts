/**
 * Format a calm baby age line from DOB or due date.
 * Returns null when no dates are available — never invents data.
 */
export function formatBabyAgeLine(input: {
  name: string;
  dateOfBirth: string | null;
  dueDate: string | null;
  now?: Date;
}): string | null {
  const now = input.now ?? new Date();
  const name = input.name.trim() || "Your baby";

  if (input.dateOfBirth) {
    const dob = parseDateOnly(input.dateOfBirth);
    if (!dob) return null;
    const months = wholeMonthsBetween(dob, now);
    if (months < 0) return null;
    if (months === 0) return `${name} · newborn`;
    if (months === 1) return `${name} · 1 month`;
    if (months < 24) return `${name} · ${months} months`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) {
      return years === 1 ? `${name} · 1 year` : `${name} · ${years} years`;
    }
    return `${name} · ${years}y ${rem}m`;
  }

  if (input.dueDate) {
    const due = parseDateOnly(input.dueDate);
    if (!due) return null;
    if (due.getTime() > now.getTime()) {
      return `${name} · arriving soon`;
    }
    const months = wholeMonthsBetween(due, now);
    if (months <= 0) return `${name} · newborn`;
    if (months === 1) return `${name} · about 1 month`;
    return `${name} · about ${months} months`;
  }

  return null;
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function wholeMonthsBetween(from: Date, to: Date): number {
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}
