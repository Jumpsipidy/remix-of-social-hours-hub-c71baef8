import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";

type NominatimHit = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: { city?: string; town?: string; village?: string; municipality?: string };
};

export type AddressValue = {
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
};

// Radviliškio r. bounding box (approx): W 23.20, N 56.10, E 24.10, S 55.55
const RADVILISKIS_VIEWBOX = "23.20,56.10,24.10,55.55";

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
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (query.trim().length < 3) {
      setHits([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query,
        )}&format=json&limit=6&countrycodes=lt&viewbox=${RADVILISKIS_VIEWBOX}&bounded=1&addressdetails=1`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        const data = (await res.json()) as NominatimHit[];
        setHits(data);
        setOpen(true);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [query]);

  const pick = (h: NominatimHit) => {
    const city =
      h.address?.city ??
      h.address?.town ??
      h.address?.village ??
      h.address?.municipality ??
      null;
    setQuery(h.display_name);
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
          placeholder="Pvz. Vaižganto g. 5, Radviliškis"
          className="w-full rounded-2xl border border-border bg-background pl-9 pr-9 py-2.5 text-sm outline-none transition focus:border-primary/60"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && hits.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-border bg-popover shadow-xl">
          {hits.map((h) => (
            <li key={h.place_id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(h)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition hover:bg-accent"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="line-clamp-2">{h.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Paieška ribojama Radviliškio rajonu · OpenStreetMap Nominatim
      </p>
    </div>
  );
}
