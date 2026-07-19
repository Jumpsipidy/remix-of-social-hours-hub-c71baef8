import { useEffect, useState } from "react";
import { Camera, MapPin } from "lucide-react";

type MapillaryImage = {
  id: string;
  thumb_1024_url: string;
  computed_geometry?: { coordinates: [number, number] };
  captured_at?: number;
};

const TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN as string | undefined;

/**
 * Finds the nearest Mapillary street-level image within `radiusMeters` of the
 * given coordinates and renders it. Falls back to a "no coverage" hint.
 * 100% free — no billing, no key rotation.
 */
export function MapillaryPreview({
  lat,
  lng,
  radiusMeters = 250,
  height = 260,
}: {
  lat: number;
  lng: number;
  radiusMeters?: number;
  height?: number;
}) {
  const [img, setImg] = useState<MapillaryImage | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "empty" | "error">("loading");

  useEffect(() => {
    if (!TOKEN) {
      setState("error");
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        // ~1 deg lat = 111 km; convert radius to a rough bbox
        const dLat = radiusMeters / 111_000;
        const dLng = radiusMeters / (111_000 * Math.cos((lat * Math.PI) / 180));
        const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(",");
        const url = `https://graph.mapillary.com/images?access_token=${TOKEN}&fields=id,thumb_1024_url,computed_geometry,captured_at&bbox=${bbox}&limit=8`;
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { data?: MapillaryImage[] };
        const data = json.data ?? [];
        if (data.length === 0) {
          setState("empty");
          return;
        }
        // Pick the geometrically closest image
        const closest = data
          .map((im) => {
            const c = im.computed_geometry?.coordinates;
            if (!c) return { im, d: Infinity };
            const [ilng, ilat] = c;
            const d = Math.hypot(ilat - lat, ilng - lng);
            return { im, d };
          })
          .sort((a, b) => a.d - b.d)[0];
        setImg(closest.im);
        setState("ok");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    })();
    return () => ac.abort();
  }, [lat, lng, radiusMeters]);

  if (state === "error" && !TOKEN) return null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-slate-900 to-slate-950"
      style={{ height }}
    >
      {state === "loading" && (
        <div className="grid h-full place-items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 animate-pulse" /> Ieškom gatvės vaizdo…
          </div>
        </div>
      )}
      {state === "empty" && (
        <div className="grid h-full place-items-center px-6 text-center text-xs text-muted-foreground">
          <div>
            <MapPin className="mx-auto mb-2 h-5 w-5 opacity-60" />
            Gatvės vaizdas šioje vietoje dar nepasiektas Mapillary.
            <br />
            Peržiūrėk vietą žemėlapyje aukščiau.
          </div>
        </div>
      )}
      {state === "error" && (
        <div className="grid h-full place-items-center px-6 text-center text-xs text-muted-foreground">
          Nepavyko įkelti gatvės vaizdo.
        </div>
      )}
      {state === "ok" && img && (
        <a
          href={`https://www.mapillary.com/app/?pKey=${img.id}&lat=${lat}&lng=${lng}&z=17`}
          target="_blank"
          rel="noopener noreferrer"
          className="group block h-full w-full"
        >
          <img
            src={img.thumb_1024_url}
            alt="Street-level view"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-3 text-xs text-white">
            <span className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              Gatvės vaizdas · Mapillary
            </span>
            <span className="opacity-80">Atidaryti 360° →</span>
          </div>
        </a>
      )}
    </div>
  );
}
