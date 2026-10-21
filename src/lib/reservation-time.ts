/** Empty times mean arrival by arrangement; never invent a fixed interval. */
export function optionalReservationTimes(start: string, end: string) {
  const s = start.trim().slice(0, 5) || null;
  const e = end.trim().slice(0, 5) || null;
  if ((s && !/^\d{2}:\d{2}$/.test(s)) || (e && !/^\d{2}:\d{2}$/.test(e))) throw new Error("Patikrink laiką.");
  if (s && e && e <= s) throw new Error("Pabaiga turi būti vėliau nei pradžia.");
  return { start: s, end: e };
}
export function reservationTimeLabel(start?: string | null, end?: string | null) {
  if (!start && !end) return "Laikas laisvas";
  if (!start) return `Iki ${end?.slice(0, 5)}`;
  if (!end) return `Nuo ${start.slice(0, 5)}`;
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}
