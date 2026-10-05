import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { MapPin, Building2, Calendar, ArrowRight, X, Navigation, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { CITY_COORDS, LITHUANIA_VIEW, cityOf } from "@/lib/cities";

const LeafletMap = lazy(() => import("./leaflet-map").then((m) => ({ default: m.LeafletMap })));

type Pin = { id: string; lat: number; lng: number; orgId: string; orgName: string; tasks: any[]; address: string };

/**
 * Whole-Lithuania map. Every organization with an open task/reservation gets
 * a pin (exact address, else its city centre). Click → details card.
 */
export function InteractiveTasksMap({
  tasks = [],
  organizations = [],
  onSelectTask,
}: {
  tasks: any[];
  organizations: any[];
  onSelectTask?: (task: any) => void;
  onSelectOrg?: (org: any) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Pin | null>(null);
  const [view, setView] = useState(LITHUANIA_VIEW);
  useEffect(() => setMounted(true), []);

  const orgName = (id: string) => {
    const o = organizations.find((x) => x.id === id);
    return o?.organization_name || o?.full_name || "Organizacija";
  };

  const pins = useMemo(() => {
    const byKey = new Map<string, Pin>();
    tasks.forEach((t) => {
      let lat = t.latitude ? Number(t.latitude) : null;
      let lng = t.longitude ? Number(t.longitude) : null;
      if (lat == null || lng == null) {
        const c = cityOf(t);
        if (!c) return;
        // Small deterministic offset so orgs in the same city don't stack.
        const h = [...String(t.organization_id)].reduce((a, ch) => a + ch.charCodeAt(0), 0);
        lat = CITY_COORDS[c].lat + ((h % 7) - 3) * 0.002;
        lng = CITY_COORDS[c].lng + ((h % 5) - 2) * 0.003;
      }
      const key = `${t.organization_id}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
      const p = byKey.get(key) ?? { id: key, lat, lng, orgId: t.organization_id, orgName: t.is_event ? (t.event_host_name || orgName(t.organization_id)) : orgName(t.organization_id), tasks: [], address: t.address || t.location || "" };
      p.tasks.push(t);
      byKey.set(key, p);
    });
    return Array.from(byKey.values());
  }, [tasks, organizations]);

  if (!mounted) return <div className="h-[600px] w-full animate-pulse rounded-3xl bg-card/50" />;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
      <div className="h-[600px] w-full">
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-card" />}>
          <LeafletMap
            lat={view.lat}
            lng={view.lng}
            zoom={view.zoom}
            height="100%"
            className="z-0 rounded-none border-0"
            showCenter={false}
            markers={pins.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: `${p.orgName} · ${p.tasks.length}`, kind: "task" as const, count: p.tasks.length }))}
            onMarkerClick={(id) => {
              const p = pins.find((m) => m.id === id) ?? null;
              setSelected(p);
              if (p) setView({ lat: p.lat, lng: p.lng, zoom: Math.max(view.zoom, 12) });
            }}
          />
        </Suspense>
      </div>

      <div className="absolute left-4 top-4 z-[500] rounded-2xl border border-border bg-background/80 px-4 py-2 backdrop-blur-md">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
          <Navigation className="h-3 w-3" /> Visa Lietuva
        </h4>
        <p className="text-[10px] text-muted-foreground">{pins.length} organizacijų vietų · {tasks.length} užduočių</p>
      </div>
      <button
        onClick={() => { setView({ ...LITHUANIA_VIEW, lat: LITHUANIA_VIEW.lat + Math.random() * 1e-6 }); setSelected(null); }}
        className="absolute right-4 top-4 z-[500] inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-foreground backdrop-blur-md active:scale-95"
      >
        <Maximize2 className="h-3.5 w-3.5" /> Rodyti visą Lietuvą
      </button>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-6 right-6 z-[600] md:left-auto md:w-96"
          >
            <div className="relative max-h-[380px] overflow-auto rounded-3xl border border-primary/30 bg-background/95 p-5 shadow-2xl backdrop-blur-2xl">
              <button onClick={() => setSelected(null)} aria-label="Uždaryti" className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15"><Building2 className="h-5 w-5 text-primary" /></div>
                <div className="min-w-0">
                  <h5 className="truncate font-bold text-foreground">{selected.orgName}</h5>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {selected.address}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {selected.tasks.map((t) => (
                  <button key={t.id} onClick={() => onSelectTask?.(t)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-left transition hover:border-primary">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{t.title}</span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="h-3 w-3" /> {t.task_date} · {Number(t.available_hours)} val.</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                  </button>
                ))}
              </div>
              <Link to="/org/$id" params={{ id: selected.orgId }} className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-accent">
                Organizacijos profilis
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
