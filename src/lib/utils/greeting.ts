/**
 * Time-of-day greeting for Glow Home.
 *
 * 5:00–11:59  Good morning
 * 12:00–17:59 Good afternoon
 * 18:00–4:59  Good evening
 */
export type GlowGreeting = "Good morning" | "Good afternoon" | "Good evening";

export function getTimeOfDayGreeting(
  date: Date = new Date(),
): GlowGreeting {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}
