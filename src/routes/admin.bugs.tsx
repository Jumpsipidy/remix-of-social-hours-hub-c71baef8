import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bug, ExternalLink, Flame, GripVertical, Trash2, FileText } from "lucide-react";
import { ListSkeleton } from "@/components/skeleton-loader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/bugs")({
  head: () => ({ meta: [
    { title: "Klaidų pranešimai · Socialinės Valandos" },
    { name: "description", content: "Socialinių Valandų administratoriaus klaidų pranešimai ir diagnostika." },
    { property: "og:title", content: "Klaidų pranešimai · Socialinės Valandos" },
    { property: "og:description", content: "Gautų problemų peržiūra, diagnostika ir sprendimo būsena." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BugsPage,
});

type BugRow = {
  id: string;
  message: string;
  reporter_email: string | null;
  reporter_user_id: string | null;
  page_url: string | null;
  severity: string;
  status: string | null;
  admin_note: string | null;
  created_at: string;
  diagnostics?: {
    screenshot?: string | null;
    viewport?: string;
    device?: { browser?: string; os?: string; device?: string };
    breadcrumbs?: { t?: number; kind?: string; label?: string; path?: string }[];
  } | null;
};

type Col = "open" | "in_progress" | "resolved";
const COLS: { key: Col; title: string; sub: string; accent: string; ring: string; bar: string; dot: string }[] = [
  { key: "open", title: "Nauji", sub: "Naujai atsiųsti", accent: "text-amber-300", ring: "border-amber-500/40", bar: "from-amber-500 to-orange-500", dot: "bg-amber-400 shadow-[0_0_12px_theme(colors.amber.400)]" },
  { key: "in_progress", title: "Vykdoma", sub: "Sprendžiama dabar", accent: "text-cyan-300", ring: "border-cyan-500/40", bar: "from-cyan-500 to-sky-500", dot: "bg-cyan-400 shadow-[0_0_12px_theme(colors.cyan.400)]" },
  { key: "resolved", title: "Išspręsta", sub: "Uždaryta", accent: "text-emerald-300", ring: "border-emerald-500/40", bar: "from-emerald-500 to-teal-500", dot: "bg-emerald-400 shadow-[0_0_12px_theme(colors.emerald.400)]" },
];

// Kanban aesthetic. Bug tracker board — 3 columns, ticket cards with severity spine.
function BugsPage() {
  const [rows, setRows] = useState<BugRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [selected, setSelected] = useState<BugRow | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("bug_reports").select("*").order("created_at", { ascending: false });
    setRows((data as BugRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function move(id: string, status: Col) {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("bug_reports").update({ status } as any).eq("id", id);
    if (error) { setRows(prev); toast.error(error.message); }
  }
  async function saveNote(id: string, admin_note: string) {
    const { error } = await supabase.from("bug_reports").update({ admin_note } as any).eq("id", id);
    if (error) toast.error(error.message);
    else setRows((rs) => rs.map((r) => (r.id === id ? { ...r, admin_note } : r)));
  }
  async function remove(id: string) {
    if (!confirm("Ištrinti pranešimą?")) return;
    const { error } = await supabase.from("bug_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.filter((r) => r.id !== id));
    toast.success("Ištrinta");
  }

  const byCol = useMemo(() => {
    const g: Record<Col, BugRow[]> = { open: [], in_progress: [], resolved: [] };
    rows.forEach((r) => { const s = (r.status ?? "open") as Col; if (g[s]) g[s].push(r); });
    return g;
  }, [rows]);

  const critical = rows.filter((r) => r.severity === "critical" && (r.status ?? "open") !== "resolved").length;

  const sevMap: Record<string, { spine: string; chip: string; label: string; glow: string }> = {
    critical: { spine: "bg-gradient-to-b from-rose-500 to-red-700", chip: "bg-rose-500/20 text-rose-300 border-rose-500/40", label: "P0 · KRITINĖ", glow: "shadow-[0_0_40px_-10px_theme(colors.rose.500)]" },
    high: { spine: "bg-gradient-to-b from-amber-500 to-orange-600", chip: "bg-amber-500/20 text-amber-300 border-amber-500/40", label: "P1 · AUKŠTA", glow: "" },
    normal: { spine: "bg-gradient-to-b from-primary to-fuchsia-500", chip: "bg-primary/20 text-primary border-primary/40", label: "P2 · ĮPRASTA", glow: "" },
    low: { spine: "bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/20", chip: "bg-muted/50 text-muted-foreground border-border", label: "P3 · ŽEMA", glow: "" },
  };

  const bugId = (r: BugRow) => `BUG-${r.id.slice(0, 6).toUpperCase()}`;

  return (
    <div className="space-y-5">
      {/* Sticker-style header */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-rose-500/5 p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 rotate-12 text-8xl opacity-10">🐞</div>
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-black shadow-xl shadow-amber-500/30">
            <Bug className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-400">Bug tracker</p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Klaidų lenta</h1>
            <p className="text-xs text-muted-foreground">Tempk kortelę tarp stulpelių, kad pakeistum būseną.</p>
          </div>
          {critical > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/50 bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 animate-pulse">
              <Flame className="h-3.5 w-3.5" />
              {critical} kritinių aktyvių
            </div>
          )}
        </div>
      </div>

      {loading && <ListSkeleton rows={4} className="py-4" />}

      <div className="grid gap-4 lg:grid-cols-3">
        {COLS.map((col) => {
          const items = byCol[col.key] ?? [];
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) { move(dragId, col.key); setDragId(null); } }}
              className={`relative flex flex-col rounded-3xl border ${col.ring} bg-card/40 p-3 backdrop-blur-xl`}
            >
              <div className={`h-1 w-full rounded-full bg-gradient-to-r ${col.bar}`} />
              <div className="mt-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <h2 className={`font-display text-sm font-bold uppercase tracking-wider ${col.accent}`}>{col.title}</h2>
                </div>
                <span className={`rounded-full border ${col.ring} bg-background/60 px-2.5 py-0.5 text-xs font-bold tabular-nums ${col.accent}`}>
                  {items.length}
                </span>
              </div>
              <p className="mb-3 px-1 text-[10px] uppercase tracking-widest text-muted-foreground">{col.sub}</p>

              <div className="flex min-h-[120px] flex-col gap-3">
                <AnimatePresence initial={false}>
                  {items.map((r, i) => {
                    const sev = sevMap[r.severity] ?? sevMap.normal;
                    return (
                      <motion.article
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        transition={{ delay: Math.min(i * 0.02, 0.2), type: "spring", stiffness: 340, damping: 30 }}
                        whileHover={{ y: -2 }}
                        draggable
                        onDragStart={() => setDragId(r.id)}
                        onDragEnd={() => setDragId(null)}
                        className={`group relative flex cursor-grab overflow-hidden rounded-2xl border border-border/60 bg-background/70 shadow-lg active:cursor-grabbing ${sev.glow}`}
                      >
                        <div className={`w-1.5 shrink-0 ${sev.spine}`} />
                        <div className="min-w-0 flex-1 p-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                            <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground">
                              {bugId(r)}
                            </span>
                            <span className={`ml-auto rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${sev.chip}`}>
                              {sev.label}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-snug">{r.message}</p>
                          <Button variant="ghost" size="sm" className="mt-1 px-0 text-primary" onClick={() => setSelected(r)}><FileText /> Visas pranešimas</Button>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                            <span className="tabular-nums">{new Date(r.created_at).toLocaleString("lt-LT")}</span>
                            {r.reporter_email && <span>· {r.reporter_email}</span>}
                            {r.page_url && (
                              <a href={r.page_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                                <ExternalLink className="h-2.5 w-2.5" /> psl.
                              </a>
                            )}
                          </div>
                          <textarea
                            defaultValue={r.admin_note ?? ""}
                            onBlur={(e) => { const v = e.target.value; if (v !== (r.admin_note ?? "")) saveNote(r.id, v); }}
                            placeholder="+ pastaba..."
                            rows={1}
                            className="mt-2 w-full resize-y rounded-lg border border-border/60 bg-background/50 p-1.5 text-[11px] outline-none placeholder:text-muted-foreground/50 focus:border-primary"
                          />
                          <div className="mt-2 flex items-center gap-1.5">
                            {COLS.filter((c) => c.key !== col.key).map((c) => (
                              <button
                                key={c.key}
                                onClick={() => move(r.id, c.key)}
                                className={`rounded-full border ${c.ring} bg-background/60 px-2 py-0.5 text-[10px] font-semibold ${c.accent} hover:bg-accent`}
                              >
                                → {c.title}
                              </button>
                            ))}
                            <button
                              onClick={() => remove(r.id)}
                              className="ml-auto grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Trinti"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
                {items.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground">
                    Tuščia
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={selected !== null} onOpenChange={(value) => { if (!value) setSelected(null); }}>
        <DialogContent className="max-w-2xl font-sans">
          <DialogHeader><DialogTitle className="tracking-normal">{selected ? bugId(selected) : "Pranešimas"}</DialogTitle><DialogDescription>Problemos aprašymas ir pridedama informacija</DialogDescription></DialogHeader>
          {selected && <div className="min-w-0 space-y-5">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{selected.message}</p>
            <dl className="grid grid-cols-1 gap-3 border-y border-border py-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Siuntėjas</dt><dd className="break-all">{selected.reporter_email || "Nenurodytas"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Gauta</dt><dd>{new Date(selected.created_at).toLocaleString("lt-LT")}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Įrenginys</dt><dd>{selected.diagnostics?.device?.browser || "—"} · {selected.diagnostics?.device?.os || "—"} · {selected.diagnostics?.viewport || "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Puslapis</dt><dd className="break-all">{selected.page_url || "—"}</dd></div>
            </dl>
            {selected.diagnostics?.screenshot?.startsWith("data:image/jpeg;base64,") && <div className="space-y-2"><h3 className="text-sm font-semibold">Ekrano nuotrauka</h3><img src={selected.diagnostics.screenshot} alt="Pranešėjo pridėta ekrano nuotrauka" className="h-auto w-full rounded-md border border-border" /></div>}
            {!!selected.diagnostics?.breadcrumbs?.length && <div className="space-y-3"><h3 className="text-sm font-semibold">Paskutiniai veiksmai</h3><ol className="space-y-3 border-l border-border pl-4">{selected.diagnostics.breadcrumbs.map((crumb, index) => <li key={index} className="break-words text-xs"><span className="font-medium">{crumb.label || crumb.kind || "Veiksmas"}</span>{crumb.path && <span className="mt-1 block break-all text-muted-foreground">{crumb.path}</span>}</li>)}</ol></div>}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
