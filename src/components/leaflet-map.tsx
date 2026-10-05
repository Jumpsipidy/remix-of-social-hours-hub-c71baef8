import type { MapMarker } from "./leaflet-map-inner";
import { lazy, Suspense, useEffect, useState } from "react";

// Client-only wrapper: leaflet touches `window` at module load and crashes SSR.
// We lazy-import the inner map after hydration so the SSR bundle never evaluates it.
const LeafletMapInner = lazy(() => import("./leaflet-map-inner"));

export type LeafletMapProps = {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number | string;
  className?: string;
  interactive?: boolean;
  onPick?: (c: { lat: number; lng: number }) => void;
  markers?: MapMarker[];
  onMarkerClick?: (id: string) => void;
  showCenter?: boolean;
};

export function LeafletMap({
  lat,
  lng,
  zoom = 15,
  height = 320,
  className,
  interactive = true,
  onPick,
  markers,
  onMarkerClick,
  showCenter,
}: LeafletMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const shell = `overflow-hidden rounded-3xl border border-border ${className ?? ""}`;

  if (!mounted) {
    return <div className={shell} style={{ height, width: "100%", background: "rgba(148,163,184,.08)" }} />;
  }

  return (
    <div className={shell} style={{ height, width: "100%" }}>
      <Suspense fallback={<div style={{ height: "100%", background: "#0b1220" }} />}>
        <LeafletMapInner lat={lat} lng={lng} zoom={zoom} interactive={interactive} onPick={onPick} markers={markers} onMarkerClick={onMarkerClick} showCenter={showCenter} />
      </Suspense>
    </div>
  );
}
