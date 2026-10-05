/** Supported cities. Must match the database city validation trigger. */
export const CITIES = ["Šeduva", "Radviliškis", "Šiauliai"] as const;
export type City = (typeof CITIES)[number];

export const CITY_COORDS: Record<City, { lat: number; lng: number }> = {
  "Šeduva": { lat: 55.7606, lng: 23.7564 },
  "Radviliškis": { lat: 55.8108, lng: 23.5399 },
  "Šiauliai": { lat: 55.9349, lng: 23.3137 },
};

/** Whole-Lithuania default view. */
export const LITHUANIA_VIEW = { lat: 55.25, lng: 23.9, zoom: 7 };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Best-effort city for a task/reservation (explicit city, else parsed from location/address). */
export function cityOf(x: { city?: string | null; location?: string | null; address?: string | null }): City | null {
  if (x.city && (CITIES as readonly string[]).includes(x.city)) return x.city as City;
  const text = norm(`${x.location ?? ""} ${x.address ?? ""}`);
  if (text.includes("seduv")) return "Šeduva";
  if (text.includes("radvilisk")) return "Radviliškis";
  if (text.includes("siaul")) return "Šiauliai";
  return null;
}
