import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, GraduationCap, Building2, School, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import {
  adminPreviewAccounts,
  adminPreviewSnapshot,
  type PreviewAccount,
  type PreviewSnapshot,
} from "@/lib/admin-preview.functions";
import { ListSkeleton } from "@/components/skeleton-loader";
import { SectionHeader, SaaSKpi, SaaSPanel } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/preview")({
  head: () => ({ meta: [{ title: "Skydelių peržiūra — Super admin" }] }),
  component: AdminPreviewPage,
});

type RoleKey = "student" | "organization" | "school_admin";

const ROLES: { key: RoleKey; label: string; icon: typeof Eye }[] = [
  { key: "student", label: "Mokinys", icon: GraduationCap },
  { key: "organization", label: "Organizacija", icon: Building2 },
  { key: "school_admin", label: "Mokyklos administratorius", icon: School },
];

function AdminPreviewPage() {
  const listAccounts = useServerFn(adminPreviewAccounts);
  const loadSnapshot = useServerFn(adminPreviewSnapshot);

  const [role, setRole] = useState<RoleKey>("student");
  const [accounts, setAccounts] = useState<PreviewAccount[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSnap, setLoadingSnap] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setSnapshot(null);
    setSelected(null);
    listAccounts({ data: { role } })
      .then((r) => { if (!cancelled) setAccounts(r.accounts); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Klaida"))
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => { cancelled = true; };
  }, [role, listAccounts]);

  const open = async (id: string) => {
    setSelected(id);
    setLoadingSnap(true);
    try {
      setSnapshot(await loadSnapshot({ data: { userId: id } }));
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko įkelti peržiūros");
    } finally {
      setLoadingSnap(false);
    }
  };

  const name = (a: PreviewAccount) => a.organization_name ?? a.full_name ?? a.email ?? "—";

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Peržiūra"
        title="Skydelių peržiūra"
        description="Pasirink paskyrą ir pamatyk, ką ji realiai mato savo skydelyje."
        icon={Eye}
        action={
          <button
            onClick={() => selected && void open(selected)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent"
          >
            <RefreshCw className={`h-3 w-3 ${loadingSnap ? "animate-spin" : ""}`} /> Atnaujinti
          </button>
        }
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ROLES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRole(r.key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              role === r.key
                ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                : "border-border bg-card/60 text-muted-foreground hover:bg-accent"
            }`}
          >
            <r.icon className="h-3.5 w-3.5" /> {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <SaaSPanel>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Paskyros ({accounts.length})
          </p>
          {loadingList && <ListSkeleton rows={6} className="py-2" />}
          {!loadingList && accounts.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Paskyrų nėra.</p>
          )}
          <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => void open(a.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selected === a.id ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:bg-accent"
                }`}
              >
                <span className="block truncate font-semibold">{name(a)}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {a.email ?? "—"}{a.class_year ? ` · ${a.class_year}` : ""}
                </span>
              </button>
            ))}
          </div>
        </SaaSPanel>

        <div className="space-y-4">
          {loadingSnap && <ListSkeleton rows={8} className="py-4" />}
          {!loadingSnap && !snapshot && (
            <SaaSPanel>
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Eye className="h-8 w-8 opacity-40" />
                Pasirink paskyrą kairėje.
              </div>
            </SaaSPanel>
          )}
          {!loadingSnap && snapshot && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SaaSKpi icon={Clock} label="Surinkta val." value={snapshot.account.hours_earned} accent="primary" />
                <SaaSKpi icon={CheckCircle2} label="Tikslas val." value={snapshot.account.hours_needed} accent="success" />
                <SaaSKpi icon={GraduationCap} label="Rezervacijos" value={snapshot.reservations.length} accent="info" />
                <SaaSKpi
                  icon={School}
                  label={snapshot.account.role === "school_admin" ? "Mokiniai" : "Užduotys"}
                  value={snapshot.account.role === "school_admin" ? snapshot.students_in_scope : snapshot.tasks.length}
                  accent="warn"
                />
              </div>

              <SaaSPanel>
                <p className="text-sm font-semibold">{name(snapshot.account)}</p>
                <p className="text-xs text-muted-foreground">
                  {snapshot.account.email ?? "—"} · {snapshot.account.role}
                  {snapshot.school_name ? ` · ${snapshot.school_name}` : ""}
                </p>
              </SaaSPanel>

              <SaaSPanel>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rezervacijos</p>
                {snapshot.reservations.length === 0 && (
                  <p className="py-4 text-sm text-muted-foreground">Rezervacijų nėra.</p>
                )}
                <div className="space-y-1.5">
                  {snapshot.reservations.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2 text-xs">
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold uppercase tracking-wider text-primary">{r.status}</span>
                      <span className="text-muted-foreground">{r.reservation_date} {r.start_time?.slice(0, 5)}–{r.end_time?.slice(0, 5)}</span>
                      <span className="rounded-full bg-accent/60 px-2 py-0.5 font-bold">{r.hours_to_earn}h</span>
                      <span className="truncate font-semibold">{r.counterpart ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </SaaSPanel>

              {snapshot.tasks.length > 0 && (
                <SaaSPanel>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Užduotys</p>
                  <div className="space-y-1.5">
                    {snapshot.tasks.map((t) => (
                      <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">{t.task_date}</span>
                        <span className="truncate font-semibold">{t.title}</span>
                        <span className="rounded-full bg-accent/60 px-2 py-0.5 font-bold">{t.available_hours}h</span>
                        {!t.is_open && <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-semibold text-destructive">uždaryta</span>}
                      </div>
                    ))}
                  </div>
                </SaaSPanel>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
