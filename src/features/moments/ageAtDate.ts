/**
 * Age at a specific occurred_on date — derived only, never stored.
 */

export type BabyAgeAtDateInput = {
  dateOfBirth: string | null;
  dueDate: string | null;
  occurredOn: string;
};

export type BabyAgeAtDateResult = {
  kind: "exact" | "approximate" | "before_birth" | "unknown";
  months: number | null;
  label: string | null;
};

export function formatBabyAgeAtDate(input: BabyAgeAtDateInput): BabyAgeAtDateResult {
  const occurred = parseDateOnly(input.occurredOn);
  if (!occurred) {
    return { kind: "unknown", months: null, label: null };
  }

  if (input.dateOfBirth) {
    const dob = parseDateOnly(input.dateOfBirth);
    if (!dob) return { kind: "unknown", months: null, label: null };

    if (occurred.getTime() < dob.getTime()) {
      return { kind: "before_birth", months: null, label: "Before birth" };
    }

    const months = wholeMonthsBetween(dob, occurred);
    return {
      kind: "exact",
      months,
      label: formatMonthsLabel(months),
    };
  }

  if (input.dueDate) {
    const due = parseDateOnly(input.dueDate);
    if (!due) return { kind: "unknown", months: null, label: null };

    if (occurred.getTime() < due.getTime()) {
      return { kind: "before_birth", months: null, label: "Before due date" };
    }

    const months = wholeMonthsBetween(due, occurred);
    const base = formatMonthsLabel(months);
    return {
      kind: "approximate",
      months,
      label: base ? (months === 0 ? "About newborn" : `About ${base.toLowerCase()}`) : null,
    };
  }

  return { kind: "unknown", months: null, label: null };
}

function formatMonthsLabel(months: number): string | null {
  if (months < 0) return null;
  if (months === 0) return "Newborn";
  if (months === 1) return "1 month";
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) {
    return years === 1 ? "1 year" : `${years} years`;
  }
  return `${years}y ${rem}m`;
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
