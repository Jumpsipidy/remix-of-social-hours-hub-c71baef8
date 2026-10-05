import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { MapPin, Building2, Calendar, Clock, ArrowRight, X, Sparkles, Filter, Search, Tag as TagIcon, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TiltCard } from "./tilt-card";
import { Magnetic, Reveal } from "./motion-kit";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

// Lazy load the real map component to avoid SSR issues with Leaflet
const LeafletMap = lazy(() => import("./leaflet-map").then(m => ({ default: m.LeafletMap })));

type OrgMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "organization" | "task";
  address: string;
  taskTitle?: string;
  taskDate?: string;
  category?: string;
};

export function InteractiveTasksMap({ 
  tasks = [], 
  organizations = [], 
  onSelectTask,
  onSelectOrg
}: { 
  tasks: any[]; 
  organizations: any[];
  onSelectTask?: (task: any) => void;
  onSelectOrg?: (org: any) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<OrgMarker | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Geolocation denied")
      );
    }
  }, []);

  const markers = useMemo(() => {
    const list: OrgMarker[] = [];
    
    // Add tasks with coordinates
    tasks.forEach(t => {
      if (t.latitude && t.longitude) {
        list.push({
          id: `task-${t.id}`,
          name: t.event_host_name || "Organizacija",
          lat: Number(t.latitude),
          lng: Number(t.longitude),
          type: "task",
          address: t.address || t.location || "",
          taskTitle: t.title,
          taskDate: t.task_date,
          category: t.category
        });
      }
    });

    // Add organizations with coordinates that don't have tasks mapped yet
    organizations.forEach(o => {
      if (o.latitude && o.longitude) {
        // Only add if not already present as a task location (simplification)
        const exists = list.some(m => Math.abs(m.lat - Number(o.latitude)) < 0.0001 && Math.abs(m.lng - Number(o.longitude)) < 0.0001);
        if (!exists) {
          list.push({
            id: `org-${o.id}`,
            name: o.organization_name || o.full_name || "Organizacija",
            lat: Number(o.latitude),
            lng: Number(o.longitude),
            type: "organization",
            address: o.address || ""
          });
        }
      }
    });

    return list;
  }, [tasks, organizations]);

  const center = userLoc || (markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 55.75, lng: 23.75 }); // Default to Šeduva area if no location

  if (!mounted) return <div className="h-[500px] w-full bg-card/50 rounded-3xl animate-pulse" />;

  return (
    <div className="relative group/map overflow-hidden rounded-3xl border border-white/10 bg-black/20 backdrop-blur-md shadow-2xl">
      <div className="h-[600px] w-full">
        <Suspense fallback={<div className="h-full w-full bg-slate-900 animate-pulse" />}>
          <LeafletMap 
            lat={center.lat} 
            lng={center.lng} 
            zoom={userLoc ? 12 : markers.length ? 11 : 8} 
            height="100%" 
            className="z-0"
            showCenter={!!userLoc}
            markers={markers.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, label: m.taskTitle || m.name, kind: m.type }))}
            onMarkerClick={(id) => setSelected(markers.find((m) => m.id === id) ?? null)}
          />
          {/* Custom markers logic would usually go inside LeafletMapInner, 
              but for this artifact we assume the LeafletMap handles basic display.
              In a real scenario, we'd pass markers to LeafletMapInner. */}
        </Suspense>
      </div>

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="rounded-2xl bg-black/60 px-4 py-2 border border-white/10 backdrop-blur-md">
          <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Navigation className="h-3 w-3" /> Interaktyvus žemėlapis
          </h4>
          <p className="text-[10px] text-white/50">{markers.length} vietų visoje Lietuvoje</p>
        </div>
      </div>

      {/* Selected Item Card Overlay */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-6 left-6 right-6 z-20 md:left-auto md:w-80"
          >
            <TiltCard intensity={15}>
              <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-background/90 p-5 shadow-2xl backdrop-blur-2xl">
                <button 
                  onClick={() => setSelected(null)}
                  className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-primary/20 border border-primary/30">
                    {selected.type === "task" ? <Calendar className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <h5 className="font-bold text-white line-clamp-1">{selected.taskTitle || selected.name}</h5>
                    <p className="text-xs text-white/60 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {selected.address}
                    </p>
                  </div>
                </div>

                {selected.type === "task" && (
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-white/80">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary" /> {selected.taskDate}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-tighter text-[9px]">#{selected.category || "Savanorystė"}</span>
                    </div>
                    <Button 
                      className="w-full mt-2 rounded-xl bg-gradient-primary shadow-glow group/btn"
                      onClick={() => {
                        const task = tasks.find(t => t.id === selected.id.replace('task-', ''));
                        if (task && onSelectTask) onSelectTask(task);
                      }}
                    >
                      Rezervuoti <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                )}
                
                {selected.type === "organization" && (
                  <div className="mt-4">
                    <Button variant="outline" className="w-full rounded-xl border-white/10 hover:bg-white/5">
                      Žiūrėti profilį
                    </Button>
                  </div>
                )}
              </div>
            </TiltCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 hidden md:flex items-center gap-4 px-4 py-2 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-white/60">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" /> Užduotys
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/40" /> Organizacijos
        </div>
      </div>
    </div>
  );
}

function Button({ children, className = "", variant = "primary", ...props }: any) {
  const base = "inline-flex items-center justify-center px-4 py-2 text-sm font-bold transition-all active:scale-[0.98]";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border bg-transparent hover:bg-accent text-foreground"
  };
  return (
    <button className={`${base} ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      {children}
    </button>
  );
}
