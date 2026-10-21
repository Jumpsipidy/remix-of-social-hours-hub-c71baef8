import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createSignupAdminTicket, consumeSignupAdminTicket, getSignupAdminCodes, createStudentAsSignupAdmin } from "@/lib/signup-admin.functions";
import { useAuth } from "@/hooks/use-auth";
import { userError } from "@/lib/user-error";
import { checkPassword } from "@/lib/password-policy";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, GraduationCap, Building2, KeyRound, Phone, Globe, Check, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signUpStudentWithCode } from "@/lib/school-signup.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthField, AuthHeading, AuthLegal, AuthSelect, AuthStage, AuthSubmit, OAuthButtons, OrDivider } from "@/components/auth-shell";
import { AuthSkeleton } from "@/components/auth-skeleton";
import { ClassCodeInput } from "@/components/class-code-input";

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

function RegisterPage() {
  const navigate = useNavigate();
  const signUpStudent = useServerFn(signUpStudentWithCode);
  const { profile, isImpersonating } = useAuth();
  const startAdmin = useServerFn(createSignupAdminTicket);
  const consumeAdmin = useServerFn(consumeSignupAdminTicket);
  const loadAdminCodes = useServerFn(getSignupAdminCodes);
  const adminCreate = useServerFn(createStudentAsSignupAdmin);
  const [adminGrant, setAdminGrant] = useState<{ ticketId: string; token: string } | null>(null);
  const [adminCodes, setAdminCodes] = useState<{ id: string; school_id: string; class_year: string; class_letter: string; signup_code: string }[]>([]);
  const [adminCodeId, setAdminCodeId] = useState("");
  const [skipEmail, setSkipEmail] = useState(false);
  const [adminRole, setAdminRole] = useState<"student" | "school_admin" | "organization">("student");
  const [adminHours, setAdminHours] = useState("");
  const [adminEarned, setAdminEarned] = useState("");
  useEffect(() => {
    const ticket = new URL(window.location.href).searchParams.get("ticket");
    if (!ticket) return;
    window.history.replaceState(null, "", "/register");
    void consumeAdmin({ data: { ticketId: ticket } }).then(async (grant) => {
      const codes = await loadAdminCodes({ data: grant });
      setAdminGrant(grant); setAdminCodes(codes);
    }).catch((error) => toast.error(userError(error)));
  }, [consumeAdmin, loadAdminCodes]);
  const [mode, setMode] = useState<Mode>("student");
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [schoolId, setSchoolId] = useState("");
  const [, setClassYear] = useState("");
  const [, setClassLetter] = useState<"A" | "B" | "">("");
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
  // Returning from login via the "Administracija" button: continue straight to the licence check.
  useEffect(() => {
    if (profile?.role !== "admin" || adminGrant) return;
    if (new URLSearchParams(window.location.search).get("admin") !== "1") return;
    startAdmin({ data: { returnUrl: `${window.location.origin}/register` } })
      .then((r) => window.location.assign(r.url))
      .catch((e) => toast.error(userError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  async function handleAccountSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (mode === "student") {
      if (!schoolId) { toast.error("Pasirink mokyklą ir klasę."); return; }
      if (fullName.trim().split(/\s+/).length < 2) { toast.error("Įvesk tikrą vardą ir pavardę."); return; }
      if (!schoolCode.trim() && !adminGrant) { toast.error("Įvesk mokyklos prisijungimo kodą."); return; }
      if (!agree && !adminGrant) { toast.error("Patvirtink, kad duomenys yra tikri."); return; }

    }
    const pwErr = await checkPassword(password, email.trim());
    if (pwErr) { toast.error(pwErr); return; }
    setLoading(true);
    try {
      if (adminGrant) {
        if (!adminCodeId) { toast.error("Pasirink klasės kodą."); return; }
        const result = await adminCreate({ data: { ...adminGrant, codeId: adminCodeId, fullName, email: email.trim(), password, skipEmail, role: adminRole, hoursOverride: adminHours.trim() ? Math.round(Number(adminHours)) : null, hoursEarned: adminEarned.trim() ? Math.round(Number(adminEarned)) : 0 } });
        toast.success(skipEmail ? "Mokinio paskyra sukurta ir aktyvuota." : result.mailSent ? "Mokinio paskyra laukia el. pašto patvirtinimo." : "Paskyra sukurta, bet laiško išsiųsti nepavyko. Mokinys gali pakartoti siuntimą patvirtinimo puslapyje.");
        setPassword(""); return;
      }
      const res = await signUpStudent({
        data: {
          email: email.trim(),
          password,
          fullName,
          schoolId,
          code: schoolCode.trim(),
          redirectTo: `${window.location.origin}/verify-email`,
        },
      });
      if (!res.ok) {
        if (res.reason === "bad_code") { toast.error("Neteisingas mokyklos kodas. Gauk jį iš klasės auklėtojo."); return; }
        throw new Error(res.reason === "signup" && res.message ? res.message : "Nepavyko sukurti paskyros");
      }
      sessionStorage.setItem("sv_signup_email", email.trim());
      if (res.mailSent === false) toast.warning("Paskyra sukurta, bet laiško išsiųsti nepavyko. Patvirtinimo puslapyje spausk „Siųsti dar kartą“.");
      else toast.success("Laiškas išsiųstas! Patikrink el. paštą (ir „Spam“ aplanką).");
      navigate({ to: "/verify-email" });
    } catch (err) {
      toast.error(userError(err, "Nepavyko sukurti paskyros."));
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
      toast.error(userError(err, "Nepavyko išsiųsti prašymo."));
    } finally { setLoading(false); }
  }

  const canSubmitStudent = !(loading || schoolsLoading || schoolsError || !schools.length);

  return (
    <AuthStage mode="register">
      <AuthHeading title="Sukurk paskyrą" subtitle="Pirmiausia pasirink, kas esi." />

      <div role="radiogroup" aria-label="Paskyros tipas" className="mt-6 grid grid-cols-2 gap-2">
        {([
          { k: "student", label: "Moksleivis", icon: GraduationCap, hint: "Kaupk valandas" },
          { k: "org_request", label: "Organizacija", icon: Building2, hint: "Pateik prašymą" },
        ] as { k: Mode; label: string; icon: typeof GraduationCap; hint: string }[]).map((opt) => {
          const active = mode === opt.k;
          return (
            <button key={opt.k} type="button" role="radio" aria-checked={active} onClick={() => setMode(opt.k)}
              className={`auth-choice relative flex items-center gap-3 rounded-2xl border p-3 text-left ${active ? "is-active border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${active ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><opt.icon className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{opt.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{opt.hint}</span>
              </span>
              <span aria-hidden className={`absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full transition-all ${active ? "scale-100 bg-primary text-primary-foreground opacity-100" : "scale-50 opacity-0"}`}><Check className="h-3 w-3" /></span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "org_request" ? (
          <motion.div key="org" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            <div className="mt-5 flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-xs leading-relaxed text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>Organizacijų paskyros <b>nekuriamos savarankiškai</b>. Pateik prašymą — administratorius patikrins organizaciją ir sukurs paskyrą.</p>
            </div>
            <form onSubmit={handleOrgRequest} className="mt-5 space-y-4">
              <AuthField id="org-name" label="Organizacijos pavadinimas" icon={Building2} value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="VšĮ „Žalioji Karta“" required />
              <AuthField id="org-code" label="Juridinio asmens kodas" icon={Building2} value={legalCode} onChange={(e) => setLegalCode(e.target.value)} placeholder="123456789" />
              <AuthField id="org-contact" label="Kontaktinis asmuo" icon={User} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jonas Jonaitis" required autoComplete="name" />
              <AuthField id="org-email" label="Kontaktinis el. paštas" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@organizacija.lt" required autoComplete="email" />
              <div className="grid gap-4 sm:grid-cols-2">
                <AuthField id="org-phone" label="Telefonas" icon={Phone} type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+370 6xx xxxxx" autoComplete="tel" />
                <AuthField id="org-web" label="Interneto svetainė" icon={Globe} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
              </div>
              <div className="auth-field">
                <label htmlFor="org-desc" className="block text-xs font-semibold leading-4 text-foreground/80">Trumpas veiklos aprašymas <span className="font-normal text-muted-foreground">(min. 30 simb.)</span></label>
                <textarea id="org-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} required
                  placeholder="Kokia veikla užsiimate, kokias užduotis norite pasiūlyti moksleiviams…"
                  className="auth-input mt-1.5 w-full rounded-xl border border-border bg-background p-3.5 text-sm outline-none" />
                <p className="mt-1 text-right text-[11px] text-muted-foreground">{description.trim().length}/30+</p>
              </div>
              <label className="auth-check flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
                <input type="checkbox" checked={confirmReal} onChange={(e) => setConfirmReal(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                <span>Patvirtinu, kad organizacija egzistuoja realiai, o pateikti duomenys yra teisingi.</span>
              </label>
              <AuthSubmit busy={loading} busyLabel="Siunčiama…">Pateikti prašymą</AuthSubmit>
            </form>
          </motion.div>
        ) : (
          <motion.div key="student" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            <div className="mt-6"><OAuthButtons /></div>
            <OrDivider />
            <form className="space-y-6" onSubmit={handleAccountSignup}>
              <Section n={1} title="Apie tave">
                <AuthField id="reg-name" label="Vardas Pavardė" icon={User} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Emilija Kazlauskaitė" required autoComplete="name" />
              </Section>

              <Section n={2} title="Mokykla ir klasė">
                {schoolsLoading ? (
                  <div role="status" aria-label="Kraunamos mokyklos">
                    <div className="auth-loading-block h-3 w-20 rounded-lg" />
                    <div className="auth-loading-block mt-2 h-12 w-full rounded-xl" />
                  </div>
                ) : schoolsError ? (
                  <div role="alert" className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    Nepavyko įkelti mokyklų.
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadSchools()}>Bandyti dar kartą</Button>
                  </div>
                ) : (
                  <AuthSelect id="reg-school" label="Mokykla" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required>
                    {schools.length === 0 && <option value="">Mokyklų nėra</option>}
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ""}</option>)}
                  </AuthSelect>
                )}
                <p className="text-xs text-muted-foreground">Klasės numeris ir A/B raidė bus priskirti pagal auklėtojo duotą kodą.</p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>Privalomos valandos <b className="text-foreground">užrakintos pagal klasės kodą</b> — jų pasirinkti nereikia.</span>
                </div>
                {adminGrant && <div className="space-y-3 border-y border-border py-4">
                  <AuthSelect id="admin-class-code" label="Klasės kodas" value={adminCodeId} onChange={(event) => {
                    setAdminCodeId(event.target.value);
                    const row = adminCodes.find((code) => code.id === event.target.value);
                    if (row) { setSchoolId(row.school_id); setSchoolCode(row.signup_code); setClassYear(row.class_year); setClassLetter(row.class_letter as "A" | "B"); }
                  }}><option value="">Pasirink kodą</option>{adminCodes.map((code) => <option key={code.id} value={code.id}>{schools.find((school) => school.id === code.school_id)?.name} · {code.class_year.split(" / ")[0]}{code.class_letter} · {code.signup_code}</option>)}</AuthSelect>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={skipEmail} onChange={(event) => setSkipEmail(event.target.checked)} />Aktyvuoti be el. pašto patvirtinimo</label>
                  <AuthSelect id="admin-role" label="Paskyros tipas" value={adminRole} onChange={(event) => setAdminRole(event.target.value as typeof adminRole)}>
                    <option value="student">Mokinys</option><option value="school_admin">Auklėtojas (kodo klasei)</option><option value="organization">Organizacija</option>
                  </AuthSelect>
                  {adminRole === "student" && <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-semibold text-muted-foreground">Privalomos val. (vietoj kodo)<input type="number" min={0} max={500} value={adminHours} onChange={(e) => setAdminHours(e.target.value)} placeholder="pagal kodą" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" /></label>
                    <label className="text-xs font-semibold text-muted-foreground">Jau turimos val.<input type="number" min={0} max={500} value={adminEarned} onChange={(e) => setAdminEarned(e.target.value)} placeholder="0" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground" /></label>
                  </div>}
                </div>}
                <ClassCodeInput value={schoolCode} onChange={setSchoolCode} />
              </Section>

              <Section n={3} title="Prisijungimo duomenys">
                <AuthField id="reg-email" label="El. paštas" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vardas@mokykla.lt" required autoComplete="email" />
                <AuthField id="reg-password" label="Slaptažodis" icon={Lock} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Bent 10 simbolių, raidės ir skaičiai" required autoComplete="new-password" />
              </Section>

              <div className="space-y-4">
                <label className="auth-check flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                  <span>Patvirtinu, kad esu tikras mokinys pasirinktoje mokykloje. Melagingi duomenys — paskyros pašalinimas.</span>
                </label>
                <AuthSubmit busy={loading} busyLabel="Kuriama…" disabled={!canSubmitStudent}>Sukurti paskyrą</AuthSubmit>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Jau turi paskyrą?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">Prisijunk</Link>
      </p>
      {!isImpersonating && !adminGrant && (
        <button
          type="button"
          aria-label="Administracinė registracija"
          title="Administracinė registracija"
          className="mx-auto mt-4 flex h-7 items-center gap-1.5 rounded-full border border-border/60 px-3 text-[11px] font-semibold text-muted-foreground/70 transition hover:border-primary/50 hover:text-foreground focus-visible:border-primary focus-visible:text-foreground"
          onClick={async () => {
            if (!profile) {
              // Signed out: sign in as Super Admin, then come straight back and continue to the licence check.
              try { sessionStorage.setItem("sv_admin_signup_return", "1"); } catch {}
              toast.info("Prisijunk kaip Super Admin — po to grįši čia ir būsi nukreiptas į licencijos patikrą.");
              window.location.assign("/login");
              return;
            }
            if (profile.role !== "admin") { toast.error("Ši parinktis skirta tik Super Admin paskyrai."); return; }
            try { const result = await startAdmin({ data: { returnUrl: `${window.location.origin}/register` } }); window.location.assign(result.url); }
            catch (error) { toast.error(userError(error)); }
          }}
        ><KeyRound className="h-3 w-3" />Administracija</button>
      )}
      {adminGrant && <p role="status" className="mt-3 text-center text-xs text-muted-foreground">Administracinė prieiga patvirtinta. Perkrovus puslapį ji išsijungs.</p>}
      <AuthLegal />
    </AuthStage>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-[10px] font-black text-primary">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
