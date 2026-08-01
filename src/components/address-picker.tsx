import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, Loader2, Sparkles } from "lucide-react";

type NominatimHit = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  importance?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    road?: string;
    house_number?: string;
    amenity?: string;
  };
};

export type AddressValue = {
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
};

// Šeduva town centre — the platform's home town.
export const SEDUVA = { lat: 55.7556, lng: 23.7519 };

// Tight box around Šeduva (primary search area).
const SEDUVA_VIEWBOX = "23.63,55.83,23.88,55.68";
// Radviliškis district (fallback search area).
const RADVILISKIS_VIEWBOX = "23.20,56.10,24.10,55.55";

/** Frequently used volunteering spots in Šeduva — one tap fills the field. */
export const SEDUVA_SUGGESTIONS: { label: string; query: string }[] = [
  { label: "Šeduvos gimnazija", query: "Šeduvos gimnazija, Šeduva" },
  { label: "Šeduvos kultūros centras", query: "Kultūros centras, Šeduva" },
  { label: "Šeduvos miesto biblioteka", query: "Biblioteka, Šeduva" },
  { label: "Šeduvos malūnas", query: "Šeduvos malūnas, Šeduva" },
  { label: "Laisvės aikštė", query: "Laisvės aikštė, Šeduva" },
  { label: "Šeduvos seniūnija", query: "Seniūnija, Šeduva" },
  { label: "Šeduvos globos namai", query: "Globos namai, Šeduva" },
  { label: "Vaižganto g., Šeduva", query: "Vaižganto gatvė, Šeduva" },
];

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Short, human label instead of Nominatim's 8-comma monster string. */
export function shortLabel(h: NominatimHit): string {
  const a = h.address ?? {};
  const head = a.amenity ?? [a.road, a.house_number].filter(Boolean).join(" ");
  const town = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
  const parts = [head, town].filter(Boolean);
  return parts.length ? parts.join(", ") : h.display_name.split(",").slice(0, 2).join(",").trim();
}

/** Closest-to-Šeduva first, then de-duplicated by label. */
export function rankHits(hits: NominatimHit[]): NominatimHit[] {
  const seen = new Set<string>();
  return [...hits]
    .sort(
      (x, y) =>
        distanceKm(SEDUVA, { lat: +x.lat, lng: +x.lon }) -
        distanceKm(SEDUVA, { lat: +y.lat, lng: +y.lon }),
    )
    .filter((h) => {
      const key = shortLabel(h).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function nominatim(q: string, viewbox: string, bounded: boolean): Promise<NominatimHit[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
    `&format=json&limit=8&countrycodes=lt&addressdetails=1&viewbox=${viewbox}&bounded=${bounded ? 1 : 0}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  return (await res.json()) as NominatimHit[];
}

export function AddressPicker({
  initial,
  onChange,
}: {
  initial?: Partial<AddressValue>;
  onChange: (v: AddressValue) => void;
}) {
  const [query, setQuery] = useState(initial?.address ?? "");
  const [hits, setHits] = useState<NominatimHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<"seduva" | "rajonas">("seduva");
  const timer = useRef<number | null>(null);
  const reqId = useRef(0);

  const showSuggestions = useMemo(() => query.trim().length < 3, [query]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (query.trim().length < 3) {
      setHits([]);
      return;
    }
    const mine = ++reqId.current;
    timer.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const q = query.trim();
        // 1) tight Šeduva box, 2) same query + „Šeduva" hint, 3) whole district.
        let found = await nominatim(q, SEDUVA_VIEWBOX, true);
        if (found.length === 0 && !/šeduv/i.test(q)) {
          found = await nominatim(`${q}, Šeduva`, SEDUVA_VIEWBOX, true);
        }
        let usedScope: "seduva" | "rajonas" = "seduva";
        if (found.length === 0) {
          found = await nominatim(q, RADVILISKIS_VIEWBOX, true);
          usedScope = "rajonas";
        }
        if (mine !== reqId.current) return;
        setScope(usedScope);
        setHits(rankHits(found));
        setOpen(true);
      } catch {
        if (mine === reqId.current) setHits([]);
      } finally {
        if (mine === reqId.current) setLoading(false);
      }
    }, 450);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [query]);

  const pick = (h: NominatimHit) => {
    const city =
      h.address?.city ?? h.address?.town ?? h.address?.village ?? h.address?.municipality ?? "Šeduva";
    setQuery(shortLabel(h));
    setOpen(false);
    onChange({
      address: h.display_name,
      city,
      latitude: parseFloat(h.lat),
      longitude: parseFloat(h.lon),
    });
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Pvz. Vaižganto g. 5, Šeduva"
          aria-label="Adreso paieška"
          className="w-full rounded-2xl border border-border bg-background pl-9 pr-9 py-2.5 text-sm outline-none transition focus:border-primary/60"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && (
        <div className="mt-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Populiaru Šeduvoje
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SEDUVA_SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setQuery(s.query)}
                className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] transition hover:border-primary/50 hover:text-primary"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {open && hits.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-popover shadow-xl">
          {hits.map((h) => {
            const km = distanceKm(SEDUVA, { lat: +h.lat, lng: +h.lon });
            return (
              <li key={h.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(h)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition hover:bg-accent"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{shortLabel(h)}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{h.display_name}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {scope === "seduva"
          ? "Paieška pirmiausia Šeduvoje · OpenStreetMap Nominatim"
          : "Šeduvoje nerasta – rodomi Radviliškio r. rezultatai · OpenStreetMap"}
      </p>
    </div>
  );
}
