import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Wrench, X, Sparkles, RefreshCw, LogIn, LogOut, Copy, Trash2, KeyRound, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  seedDevEcosystem, resetDevData, listDevProfiles,
  createTestAccount, listSchoolCodes, testSignupCode, verifyAccountDeleted,
} from "@/lib/dev-tools.functions";
import { adminDeleteAccount } from "@/lib/admin-delete.functions";
import { useAuth, type Profile } from "@/hooks/use-auth";

const DASH_BY_ROLE: Record<string, string> = {
  student: "/student", organization: "/organization", school_admin: "/school", admin: "/admin",
};
const ROLE_LABEL: Record<string, string> = {
  student: "Mokinys", organization: "Organizacija", school_admin: "Mokyklos admin.", admin: "Super Admin",
};

type Tab = "accounts" | "create" | "codes";
type School = { id: string; name: string; signup_code: string | null; is_active: boolean };

export function MockTesterPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("accounts");
  const [busy, setBusy] = useState<string | null>(null);
  const [seededProfiles, setSeededProfiles] = useState<Profile[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [codeSchoolId, setCodeSchoolId] = useState<string>("");
  const [codeResult, setCodeResult] = useState<null | boolean>(null);
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string; role: string; id: string } | null>(null);
  const navigate = useNavigate();
  const seed = useServerFn(seedDevEcosystem);
  const reset = useServerFn(resetDevData);
  const list = useServerFn(listDevProfiles);
  const createOne = useServerFn(createTestAccount);
  const loadCodes = useServerFn(listSchoolCodes);
  const runCodeTest = useServerFn(testSignupCode);
  const deleteAcc = useServerFn(adminDeleteAccount);
  const verifyDel = useServerFn(verifyAccountDeleted);
  const { impersonate, impersonateReal, isImpersonating, clearImpersonation, profile } = useAuth();

  if (profile?.role !== "admin") return null;

  const refresh = async () => {
    const { profiles } = await list();
    setSeededProfiles(profiles as Profile[]);
  };
  const refreshSchools = async () => {
    const { schools } = await loadCodes();
    setSchools(schools as School[]);
    if (schools[0]) setCodeSchoolId((schools[0] as School).id);
  };

  const openPanel = async () => {
    setOpen(true);
    if (seededProfiles.length === 0) await refresh();
  };

  const handleSeed = async () => {
    setBusy("seed");
    try { const r = await seed(); toast.success(`Sukurta ${r.accounts.length} paskyrų`); await refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Nepavyko"); }
    finally { setBusy(null); }
  };
  const handleReset = async () => {
    if (!confirm("Ištrinti VISAS ne-admin paskyras?")) return;
    setBusy("reset");
    try { const r = await reset(); toast.success(`Išvalyta ${r.cleared} paskyrų`); await refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Nepavyko"); }
    finally { setBusy(null); }
  };
  const handleImpersonate = async (p: Profile) => {
    setBusy(p.id);
    try {
      // Real sign-in so RLS treats us as this user (hours, chat, reservations work).
      // All debug accounts share DevPass123!. Falls back to mock if password differs.
      if (p.email?.endsWith("@dev.local")) {
        await impersonateReal(p.email, "DevPass123!");
        toast.success(`Prisijungta kaip ${ROLE_LABEL[p.role]} (tikra sesija)`);
      } else {
        impersonate(p);
        toast.success(`Mock: ${ROLE_LABEL[p.role]} (be RLS)`);
      }
      navigate({ to: DASH_BY_ROLE[p.role] ?? "/" });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko prisijungti");
    } finally { setBusy(null); }
  };
  const handleDelete = async (p: Profile) => {
    if (!confirm(`Ištrinti ${p.email} ir patikrinti?`)) return;
    setBusy(p.id);
    try {
      await deleteAcc({ data: { userId: p.id } });
      const check = await verifyDel({ data: { userId: p.id } });
      if (check.fully_deleted) toast.success("✅ Paskyra pilnai ištrinta (auth + profilis)");
      else toast.error(`⚠️ Liko: profilis=${check.profile_exists} auth=${check.auth_exists}`);
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "Klaida"); }
    finally { setBusy(null); }
  };
  const handleCreateOne = async (role: "student" | "organization" | "school_admin" | "admin", andLogin = false) => {
    setBusy("create-" + role);
    try {
      const r = await createOne({ data: { role } });
      setLastCreated({ email: r.account.email, password: r.account.password, role: r.account.role, id: r.account.id });
      await refresh();
      if (andLogin) {
        await impersonateReal(r.account.email, r.account.password);
        toast.success(`Sukurta + prisijungta kaip ${ROLE_LABEL[role]}`);
        navigate({ to: DASH_BY_ROLE[role] ?? "/" });
        setOpen(false);
        return;
      }
      toast.success("Sukurta – kredencialai apačioje");
    } catch (e: any) { toast.error(e?.message ?? "Nepavyko"); }
    finally { setBusy(null); }
  };
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Nukopijuota"); };
  const handleTestCode = async () => {
    if (!codeSchoolId || !codeInput) return;
    setBusy("code");
    try { const r = await runCodeTest({ data: { school_id: codeSchoolId, code: codeInput } }); setCodeResult(r.valid); }
    catch (e: any) { toast.error(e?.message ?? "Klaida"); }
    finally { setBusy(null); }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-sans">
      {!open ? (
        <button onClick={openPanel} title="Kūrėjo režimas"
          className="flex h-11 items-center gap-2 rounded-full border border-border bg-card/95 px-4 text-sm font-semibold shadow-lg backdrop-blur transition hover:scale-105">
          🛠️ <span className="hidden sm:inline">Admin Debug</span>
          {isImpersonating && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] uppercase text-primary">Mock</span>}
        </button>
      ) : (
        <div className="w-[400px] max-h-[85vh] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
            <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /><span className="text-sm font-bold">Admin Debug</span></div>
            <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
          </div>

          <div className="flex border-b border-border text-xs">
            {([["accounts","Paskyros"],["create","Kurti"],["codes","Kodai"]] as [Tab,string][]).map(([k,l]) => (
              <button key={k} onClick={() => { setTab(k); if (k==="codes" && schools.length===0) refreshSchools(); }}
                className={`flex-1 py-2 font-semibold transition ${tab===k ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-accent"}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tab === "accounts" && (
              <>
                <div className="flex gap-2">
                  <button onClick={handleSeed} disabled={busy==="seed"} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
                    <Sparkles className="h-3.5 w-3.5" />{busy==="seed" ? "Kuriama…" : "Sukurti ekosistemą"}
                  </button>
                  <button onClick={handleReset} disabled={busy==="reset"} className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 text-destructive px-3 py-2 text-xs font-semibold hover:bg-destructive/10 disabled:opacity-50">
                    <RefreshCw className={`h-3.5 w-3.5 ${busy==="reset" ? "animate-spin" : ""}`} />Wipe
                  </button>
                </div>
                <div className="space-y-1.5">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Test paskyros ({seededProfiles.length})</p>
                  {seededProfiles.length === 0 && <p className="rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground">Nėra. Spausk „Sukurti ekosistemą" arba naudok „Kurti" skirtuką.</p>}
                  {seededProfiles.map((p) => (
                    <div key={p.id} className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold">{p.full_name ?? p.email}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{ROLE_LABEL[p.role]} · {p.email}</div>
                      </div>
                      <button onClick={() => copy(p.email ?? "")} title="Kopijuoti el. paštą" className="grid h-7 w-7 place-items-center rounded hover:bg-accent"><Copy className="h-3 w-3" /></button>
                      <button onClick={() => handleImpersonate(p)} disabled={busy===p.id} title="Prisijungti" className="grid h-7 w-7 place-items-center rounded hover:bg-accent text-primary"><LogIn className="h-3 w-3" /></button>
                      <button onClick={() => handleDelete(p)} disabled={busy===p.id} title="Ištrinti + verifikuoti" className="grid h-7 w-7 place-items-center rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
                {isImpersonating && (
                  <button onClick={() => { clearImpersonation(); toast.success("Baigta"); navigate({ to: "/" }); }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10">
                    <LogOut className="h-3.5 w-3.5" /> Baigti impersonaciją
                  </button>
                )}
              </>
            )}

            {tab === "create" && (
              <>
                <p className="text-[11px] text-muted-foreground">Vieno mygtuko debug. Slaptažodis: <code className="rounded bg-muted px-1">DevPass123!</code></p>
                <button
                  onClick={() => {
                    const w = window as any;
                    if (typeof w.__pushNotification === "function") {
                      w.__pushNotification({
                        kind: Math.random() > 0.5 ? "message" : "reservation",
                        title: "🔔 Test pranešimas",
                        body: "Sveikas! Tai fake pranešimas iš debug panelės.",
                        status: "approved",
                      });
                      toast.success("Test pranešimas išsiųstas");
                    } else {
                      toast.error("NotificationBell dar neužkrautas");
                    }
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
                >
                  🔔 Trigger fake pranešimą (test popup)
                </button>

                <div className="space-y-2">
                  {(["student","organization","school_admin","admin"] as const).map(r => (
                    <div key={r} className="flex gap-1.5">
                      <button onClick={() => handleCreateOne(r, true)} disabled={!!busy}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
                        <LogIn className="h-3.5 w-3.5" /> Sukurti + Login: {ROLE_LABEL[r]}
                      </button>
                      <button onClick={() => handleCreateOne(r, false)} disabled={!!busy}
                        title="Tik sukurti, be prisijungimo"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-50">
                        <UserPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {lastCreated && (
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-[11px] space-y-1">
                    <div className="font-semibold text-primary">✅ {ROLE_LABEL[lastCreated.role]} sukurta</div>
                    <div className="flex items-center gap-1"><code className="flex-1 truncate rounded bg-background px-2 py-1">{lastCreated.email}</code><button onClick={() => copy(lastCreated.email)} className="grid h-6 w-6 place-items-center rounded hover:bg-accent"><Copy className="h-3 w-3" /></button></div>
                    <div className="flex items-center gap-1"><code className="flex-1 truncate rounded bg-background px-2 py-1">{lastCreated.password}</code><button onClick={() => copy(lastCreated.password)} className="grid h-6 w-6 place-items-center rounded hover:bg-accent"><Copy className="h-3 w-3" /></button></div>
                  </div>
                )}
              </>
            )}

            {tab === "codes" && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mokyklų kodai</p>
                  <button onClick={refreshSchools} className="grid h-6 w-6 place-items-center rounded hover:bg-accent"><RefreshCw className="h-3 w-3" /></button>
                </div>
                {schools.map(s => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{s.name}</div>
                      <code className="text-[10px] text-primary">{s.signup_code ?? "—"}</code>
                    </div>
                    {s.signup_code && <button onClick={() => copy(s.signup_code!)} className="grid h-7 w-7 place-items-center rounded hover:bg-accent"><Copy className="h-3 w-3" /></button>}
                  </div>
                ))}
                <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                  <p className="text-[11px] font-semibold flex items-center gap-1"><KeyRound className="h-3 w-3" /> Patikrinti kodą</p>
                  <select value={codeSchoolId} onChange={e => { setCodeSchoolId(e.target.value); setCodeResult(null); }}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs">
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <input value={codeInput} onChange={e => { setCodeInput(e.target.value); setCodeResult(null); }}
                      placeholder="Įvesk kodą" className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs" />
                    <button onClick={handleTestCode} disabled={busy==="code" || !codeInput} className="rounded bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50">Test</button>
                  </div>
                  {codeResult !== null && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${codeResult ? "text-emerald-500" : "text-destructive"}`}>
                      {codeResult ? <><CheckCircle2 className="h-3.5 w-3.5"/> Kodas galioja</> : <><XCircle className="h-3.5 w-3.5"/> Kodas neteisingas</>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
