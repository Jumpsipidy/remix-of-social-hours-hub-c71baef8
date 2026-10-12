import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Heart, Mail, Lock, User, GraduationCap, School as SchoolIcon, Building2, Clock, Send, Sparkles, Rocket, Award, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signUpStudentWithCode } from "@/lib/school-signup.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell, OAuthButtons } from "@/components/auth-shell";
import { AuthSkeleton } from "@/components/auth-skeleton";

export const Route = createFileRoute("/_auth/register")({
  ssr: false,
  pendingComponent: () => <AuthSkeleton mode="register" />,
  pendingMs: 120,
  pendingMinMs: 0,
  head: () => ({
    meta: [
      { title: "Registruotis — Socialinės Valandos" },
      { name: "description", content: "Sukurk moksleivio paskyrą su mokyklos kodu ir klase arba pateik organizacijos prieigos prašymą Socialinių Valandų platformoje." },
      { property: "og:title", content: "Registruotis — Socialinės Valandos" },
      { property: "og:description", content: "Sukurk paskyrą Socialinių Valandų platformoje ir pradėk rinkti savanorystės valandas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://socialinesvalandos.dev/register" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/register" }],
  }),
  component: RegisterPage,
});

type Mode = "student" | "org_request";
type SchoolRow = { id: string; name: string; city: string | null };

const CLASS_YEARS = ["5", "6", "7", "8", "9 / I gimn.", "10 / II gimn.", "11 / III gimn.", "12 / IV gimn."];
function isLowerClass(cy: string) { return cy === "5" || cy === "6" || cy === "7"; }
function hoursRuleFor(cy: string): { locked: boolean; min: number; default: number } {
  if (isLowerClass(cy)) return { locked: true, min: 20, default: 20 };
  return { locked: false, min: 8, default: 20 };
}

function RegisterPage() {
  const navigate = useNavigate();
  const signUpStudent = useServerFn(signUpStudentWithCode);
  const [mode, setMode] = useState<Mode>("student");
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [schoolId, setSchoolId] = useState("");
  const [classYear, setClassYear] = useState("");
  const [classLetter, setClassLetter] = useState<"A" | "B" | "">("");
  const [hoursNeeded, setHoursNeeded] = useState(20);
  const [schoolCode, setSchoolCode] = useState("");
  const [agree, setAgree] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [legalCode, setLegalCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [confirmReal, setConfirmReal] = useState(false);


  async function loadSchools() {
    setSchoolsLoading(true);
    setSchoolsError(false);
    try {
      const { data, error } = await supabase.from("schools").select("id, name, city").eq("is_active", true).order("name");
      if (error) throw error;
      const rows = (data as SchoolRow[]) ?? [];
      setSchools(rows);
      setSchoolId((current) => current || rows[0]?.id || "");
    } catch {
      setSchoolsError(true);
    } finally {
      setSchoolsLoading(false);
    }
  }

  useEffect(() => { void loadSchools(); }, []);

  async function handleAccountSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (mode === "student") {
      if (!schoolId || !classYear || !classLetter) { toast.error("Pasirink mokyklą ir klasę."); return; }
      if (fullName.trim().split(/\s+/).length < 2) { toast.error("Įvesk tikrą vardą ir pavardę."); return; }
      if (!schoolCode.trim()) { toast.error("Įvesk mokyklos prisijungimo kodą."); return; }
      if (!agree) { toast.error("Patvirtink, kad duomenys yra tikri."); return; }
      const rule = hoursRuleFor(classYear);
      if (!rule.locked && hoursNeeded < rule.min) { toast.error(`8+ klasėms — min. ${rule.min} val.`); return; }

    }
    setLoading(true);
    try {
      const res = await signUpStudent({
        data: {
          email: email.trim(),
          password,
          fullName,
          schoolId,
          classYear: classYear as never,
          classLetter: classLetter as "A" | "B",
          hoursNeeded: isLowerClass(classYear) ? 20 : Math.max(8, hoursNeeded),
          code: schoolCode.trim(),
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (!res.ok) {
        if (res.reason === "bad_code") { toast.error("Neteisingas mokyklos kodas. Gauk jį iš klasės auklėtojo."); return; }
        throw new Error(res.reason === "signup" && res.message ? res.message : "Nepavyko sukurti paskyros");
      }
      const signUp = { session: res.session };
      if (res.session) await supabase.auth.setSession(res.session);
      sessionStorage.setItem("sv_signup_email", email.trim());
      if (!signUp.session) {
        toast.success("Paskyra sukurta! Patvirtink el. paštą kodu.");
        navigate({ to: "/verify-email" });
      } else {
        // Session active — send welcome email (bearer is already attached)
        import("@/lib/email.functions").then(({ sendWelcomeEmail }) =>
          sendWelcomeEmail().catch((e) => console.warn("[email] welcome failed", e)),
        );
        toast.success("Paskyra sukurta! Sveiki atvykę.");
        navigate({ to: "/student" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko sukurti paskyros");
    } finally { setLoading(false); }
  }

  async function handleOrgRequest(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!confirmReal) { toast.error("Patvirtink, kad pateikta informacija yra tikra."); return; }
    if (orgName.trim().length < 3 || description.trim().length < 30) {
      toast.error("Užpildyk visus laukelius (aprašymas – bent 30 simbolių)."); return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("organization_access_requests").insert({
        organization_name: orgName.trim(),
        legal_code: legalCode.trim() || null,
        contact_name: fullName.trim(),
        contact_email: email.trim(),
        contact_phone: contactPhone.trim() || null,
        website: website.trim() || null,
        description: description.trim(),
      });
      if (error) throw error;
      toast.success("Prašymas pateiktas! Administratorius peržiūrės ir susisieks.");
      setOrgName(""); setLegalCode(""); setContactPhone(""); setWebsite(""); setDescription(""); setConfirmReal(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Nepavyko išsiųsti prašymo");
    } finally { setLoading(false); }
  }

  return (
    <AuthShell mode="register">
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter">Sukurk paskyrą</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Pasirink kas esi.</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>

              {/* Mode switch */}
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {([
                  { k: "student", label: "Moksleivis", icon: GraduationCap, hint: "Kaupk valandas" },
                  { k: "org_request", label: "Organizacija", icon: Building2, hint: "Pateik prašymą" },
                ] as { k: Mode; label: string; icon: typeof GraduationCap; hint: string }[]).map((opt) => {
                  const active = mode === opt.k;
                  return (
                    <Button variant="outline" key={opt.k} type="button" onClick={() => setMode(opt.k)}
                      className={`group/mode h-auto relative flex flex-col items-start gap-1 overflow-hidden rounded-2xl border p-3 text-left transition-all ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60 backdrop-blur hover:-translate-y-0.5 hover:border-primary/50"}`}>
                      <opt.icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className={`text-[11px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.hint}</span>
                    </Button>
                  );
                })}
              </div>

              {mode === "org_request" ? (
                <>
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-xs text-foreground leading-relaxed shadow-lg"
                  >
                    <div className="flex items-center gap-2 mb-1 text-foreground font-bold uppercase tracking-wider">
                      <Clock className="h-3 w-3" /> Svarbu
                    </div>
                    Organizacijų paskyros <b>nekuriamos savarankiškai</b>. Pateik prašymą — administratorius patikrins tavo organizaciją ir sukurs paskyrą rankiniu būdu.
                  </motion.div>
                  <form onSubmit={handleOrgRequest} className="mt-5 space-y-4">
                    <Field label="Organizacijos pavadinimas" icon={Building2} value={orgName} onChange={setOrgName} placeholder="VšĮ „Žalioji Karta“" required />
                    <Field label="Juridinio asmens kodas" icon={Building2} value={legalCode} onChange={setLegalCode} placeholder="123456789" />
                    <Field label="Kontaktinis asmuo" icon={User} value={fullName} onChange={setFullName} placeholder="Jonas Jonaitis" required />
                    <Field label="Kontaktinis el. paštas" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="info@organizacija.lt" required />
                    <Field label="Telefonas" icon={Mail} value={contactPhone} onChange={setContactPhone} placeholder="+370 6xx xxxxx" />
                    <Field label="Interneto svetainė" icon={Mail} value={website} onChange={setWebsite} placeholder="https://…" />
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Trumpas veiklos aprašymas (min. 30 simb.)</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} required
                        placeholder="Kokia veikla užsiimate, kokias užduotis norite pasiūlyti moksleiviams…"
                        className="mt-1.5 w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none backdrop-blur transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-ring/20" />
                    </div>
                    <label className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                      <input type="checkbox" checked={confirmReal} onChange={(e) => setConfirmReal(e.target.checked)} className="mt-0.5" />
                      <span>Patvirtinu, kad organizacija egzistuoja realiai, o pateikti duomenys yra teisingi.</span>
                    </label>
                    <Button
                      type="submit" disabled={loading}
                      className="group/submit relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent transition-transform duration-1000 group-hover/submit:translate-x-full" />
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Siunčiama…</> : <><Send className="h-4 w-4" /> Pateikti prašymą</>}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mt-6"><OAuthButtons /></div>
                  <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
                    arba el. paštu
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
                  </div>

                  <form className="space-y-4" onSubmit={handleAccountSignup}>
                    <Field label="Vardas Pavardė" icon={User} value={fullName} onChange={setFullName} placeholder="Emilija Kazlauskaitė" required />

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mokykla</label>
                      {schoolsLoading ? (
                        <div role="status" aria-label="Kraunamos mokyklos" className="mt-1.5">
                          <Skeleton className="h-11 w-full rounded-xl" />
                        </div>
                      ) : schoolsError ? (
                        <div role="alert" className="mt-2 flex items-center justify-between gap-2 text-sm text-destructive">
                          Nepavyko įkelti mokyklų.
                          <Button type="button" variant="outline" size="sm" onClick={() => void loadSchools()}>Bandyti dar kartą</Button>
                        </div>
                      ) : <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground outline-none backdrop-blur transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-ring/20">
                        {schools.length === 0 && <option value="">Mokyklų nėra</option>}
                        {schools.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ""}</option>)}
                      </select>}
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Klasė</label>
                      <select value={classYear && classLetter ? `${classYear}|${classLetter}` : ""} onChange={(e) => { const [y, l] = e.target.value.split("|"); setClassYear(y ?? ""); setClassLetter((l as "A" | "B") ?? ""); }} required
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground outline-none backdrop-blur transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-ring/20">
                        <option value="">Pasirink…</option>
                        {CLASS_YEARS.flatMap((c) => (["A", "B"] as const).map((l) => <option key={c + l} value={`${c}|${l}`}>{c.split(" / ")[0]}{l}{c.includes(" / ") ? ` (${c.split(" / ")[1]})` : ""}</option>))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-success/30 bg-success/10 p-4 backdrop-blur">
                      <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-success">
                        <Clock className="h-4 w-4" /> Kiek valandų turi atlikti?
                      </label>
                      {classYear && isLowerClass(classYear) ? (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="grid h-11 w-24 place-items-center rounded-xl border border-success/40 bg-success/10 text-sm font-bold text-foreground">20</div>
                          <span className="text-xs text-muted-foreground">val. — <b>5–7 klasėms</b> fiksuota.</span>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-3">
                          <input type="number" min={classYear ? hoursRuleFor(classYear).min : 8} max={500}
                            value={hoursNeeded} required
                            onChange={(e) => setHoursNeeded(Math.max(classYear ? hoursRuleFor(classYear).min : 8, Number(e.target.value)))}
                            className="h-11 w-24 rounded-xl border border-border bg-background px-3 text-center text-sm font-bold outline-none focus:border-primary" />
                          <span className="text-xs text-muted-foreground">val. per metus (min. {classYear ? hoursRuleFor(classYear).min : 8}).</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mokyklos kodas</label>
                      <input type="text" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} required
                        autoComplete="off" placeholder="Mokyklos registracijos kodas"
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background/60 px-3 text-sm tracking-wider outline-none backdrop-blur transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-ring/20" />
                      <p className="mt-1 text-[11px] text-muted-foreground">🔑 Iš klasės auklėtojo / mokyklos administratoriaus.</p>
                    </div>

                    <Field label="El. paštas" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="vardas@mokykla.lt" required />
                    <Field label="Slaptažodis" icon={Lock} type="password" value={password} onChange={setPassword} placeholder="Bent 8 simboliai" required />

                    <label className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 text-[11px] text-muted-foreground backdrop-blur">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
                      <span>Patvirtinu, kad esu tikras mokinys pasirinktoje mokykloje. Melagingi duomenys — paskyros pašalinimas.</span>
                    </label>

                    <Button
                      type="submit" disabled={loading || schoolsLoading || schoolsError || !schools.length}
                      className="group/submit relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent transition-transform duration-1000 group-hover/submit:translate-x-full" />
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Kuriama…</> : <>Sukurti paskyrą <ArrowRight className="h-4 w-4 transition-transform group-hover/submit:translate-x-1" /></>}
                    </Button>
                  </form>
                </>
              )}

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Jau turi paskyrą?{" "}
                <Link to="/login" viewTransition resetScroll={false} className="font-semibold text-primary hover:underline">Prisijunk</Link>
              </p>
              <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                Tęsdamas sutinki su{" "}
                <Link to="/terms" className="font-semibold underline underline-offset-2 hover:text-foreground">Naudojimosi taisyklėmis</Link>{" "}ir{" "}
                <Link to="/privacy" className="font-semibold underline underline-offset-2 hover:text-foreground">Privatumo politika</Link>.
              </p>
            </div>
    </AuthShell>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = "text", required }: {
  label: string; icon: typeof User; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="group/f mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 backdrop-blur transition-all focus-within:border-primary focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/20">
        <Icon className="h-4 w-4 text-muted-foreground transition-colors group-focus-within/f:text-success" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder={placeholder} />
      </div>
    </div>
  );
}
