import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Heart, Mail, Lock, User, GraduationCap, School as SchoolIcon, Building2, Clock, Send, Sparkles, Rocket, Award, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { verifySchoolSignupCode } from "@/lib/school-signup.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Registruotis — Socialinės Valandos" },
      { name: "description", content: "Sukurk moksleivio paskyrą su mokyklos kodu ir klase arba pateik organizacijos prieigos prašymą Socialinių Valandų platformoje." },
      { property: "og:title", content: "Registruotis — Socialinės Valandos" },
      { property: "og:description", content: "Sukurk paskyrą Socialinių Valandų platformoje ir pradėk rinkti savanorystės valandas." },
      { property: "og:url", content: "https://socialinesvalandos.lovable.app/register" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.lovable.app/register" }],
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
  const verifyCode = useServerFn(verifySchoolSignupCode);
  const [mode, setMode] = useState<Mode>("student");
  const [schools, setSchools] = useState<SchoolRow[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [schoolId, setSchoolId] = useState("");
  const [classYear, setClassYear] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState(20);
  const [schoolCode, setSchoolCode] = useState("");
  const [agree, setAgree] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [legalCode, setLegalCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [confirmReal, setConfirmReal] = useState(false);

  // Tilt effect for card
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-4, 4]), { stiffness: 120, damping: 14 });
  function handleMove(e: React.MouseEvent) {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }
  function handleLeave() { mx.set(0); my.set(0); }

  useEffect(() => {
    supabase.from("schools").select("id, name, city").eq("is_active", true).order("name")
      .then(({ data }) => {
        const rows = (data as SchoolRow[]) ?? [];
        setSchools(rows);
        if (rows.length && !schoolId) setSchoolId(rows[0].id);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAccountSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (mode === "student") {
      if (!schoolId || !classYear) { toast.error("Pasirink mokyklą ir klasę."); return; }
      if (fullName.trim().split(/\s+/).length < 2) { toast.error("Įvesk tikrą vardą ir pavardę."); return; }
      if (!schoolCode.trim()) { toast.error("Įvesk mokyklos prisijungimo kodą."); return; }
      if (!agree) { toast.error("Patvirtink, kad duomenys yra tikri."); return; }
      const rule = hoursRuleFor(classYear);
      if (!rule.locked && hoursNeeded < rule.min) { toast.error(`8+ klasėms — min. ${rule.min} val.`); return; }
      const { ok } = await verifyCode({ data: { schoolId, code: schoolCode.trim() } });
      if (!ok) { toast.error("Neteisingas mokyklos kodas. Gauk jį iš klasės auklėtojo."); return; }
    }
    setLoading(true);
    try {
      const { data: signUp, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            role: mode,
            full_name: fullName,
            hours_needed: mode === "student" ? (isLowerClass(classYear) ? 20 : Math.max(8, hoursNeeded)) : 0,
            school_id: mode === "student" ? schoolId : null,
            class_year: mode === "student" ? classYear : null,
          },
        },
      });
      if (error) throw error;
      if (mode === "student" && signUp.user) {
        await supabase.from("profiles").update({ school_id: schoolId, class_year: classYear }).eq("id", signUp.user.id);
      }
      sessionStorage.setItem("sv_signup_email", email.trim());
      if (!signUp.session) {
        toast.success("Paskyra sukurta! Patvirtink el. paštą kodu.");
        navigate({ to: "/verify-email" });
      } else {
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

  async function handleGoogle() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });
    if (error) toast.error("Nepavyko prisijungti per Google");
  }
  async function handleDiscord() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "discord", options: { redirectTo } });
    if (error) toast.error("Nepavyko prisijungti per Discord");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Aurora background — emerald/teal tint (unique vibe vs. login) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(160_80%_45%/0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.22),transparent_50%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--card)))]" />
        <motion.div
          className="absolute -left-32 bottom-10 h-[520px] w-[520px] rounded-full bg-emerald-500/25 blur-[140px]"
          animate={{ x: [0, 60, -20, 0], y: [0, -40, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-40 top-10 h-[460px] w-[460px] rounded-full bg-primary/25 blur-[140px]"
          animate={{ x: [0, -50, 30, 0], y: [0, 30, -20, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[140px]"
          animate={{ x: [0, 30, -40, 0], y: [0, -20, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:44px_44px]" />
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-emerald-400/70 shadow-[0_0_10px_hsl(160_80%_50%)]"
            style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }}
            animate={{ y: [0, -18, 0], opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12">
        {/* Left — journey narrative */}
        <div className="hidden flex-col justify-center lg:flex">
          <Link to="/" className="group inline-flex items-center gap-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-110">
              <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-2xl font-bold">Socialinės Valandos</span>
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mt-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300 backdrop-blur">
              <Rocket className="h-3 w-3" /> Pradžia · 60 sekundžių
            </div>
            <h1 className="mt-6 max-w-lg text-6xl font-black leading-[1.02] tracking-tight">
              Pradėk savo<br />
              <span className="bg-[linear-gradient(120deg,hsl(160_80%_55%),hsl(var(--primary)),hsl(160_80%_55%))] bg-[length:200%_100%] bg-clip-text text-transparent [animation:gradient-shift_6s_ease_infinite]">
                valandų kelionę
              </span><br />
              šiandien.
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              Sukurk paskyrą per minutę. Įrašyk mokyklos kodą, pasirink klasę — ir jau gali rezervuoti pirmąją savanorystę.
            </p>
          </motion.div>

          <ol className="mt-10 grid max-w-md gap-3">
            {[
              { n: "01", icon: SchoolIcon, title: "Įvesk mokyklos kodą", body: "Gauk iš klasės auklėtojo — patvirtina, kad esi tikras mokinys." },
              { n: "02", icon: GraduationCap, title: "Pasirink klasę", body: "5–7 kl. — 20 val. 8+ kl. — bent 8 val. per metus." },
              { n: "03", icon: Award, title: "Rink valandas", body: "Rezervuok užduotis, atlik, gauk patvirtinimą — viskas skaidru." },
            ].map((s, i) => (
              <motion.li
                key={s.n}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i + 0.3 }}
                whileHover={{ x: 4 }}
                className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/40 p-4 backdrop-blur-xl transition-colors hover:border-emerald-400/50 hover:bg-card/70"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,hsl(160_80%_45%),hsl(var(--primary)))] text-primary-foreground shadow-[0_10px_30px_-10px_hsl(160_80%_50%/0.6)] transition-transform group-hover:rotate-6">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-emerald-400/80">{s.n}</span>
                    <p className="text-sm font-semibold">{s.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Right — form card */}
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-lg font-bold">Socialinės Valandos</span>
          </Link>

          <motion.div
            ref={cardRef}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-[2rem] p-[1.5px]"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-[conic-gradient(from_0deg,hsl(160_80%_50%),hsl(var(--primary)),hsl(160_80%_50%/0.3),hsl(160_80%_50%))] opacity-70 blur-[1px] [animation:spin_10s_linear_infinite]" aria-hidden />
            <div className="relative rounded-[calc(2rem-1.5px)] border border-border/50 bg-card/80 p-8 shadow-elegant backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Sukurk paskyrą</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Pasirink kas esi.</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,hsl(160_80%_45%),hsl(var(--primary)))] shadow-[0_10px_30px_-10px_hsl(160_80%_50%/0.7)]">
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
                    <button key={opt.k} type="button" onClick={() => setMode(opt.k)}
                      className={`group/mode relative flex flex-col items-start gap-1 overflow-hidden rounded-2xl border p-3 text-left transition-all ${active ? "border-transparent bg-[linear-gradient(135deg,hsl(160_80%_45%),hsl(var(--primary)))] text-primary-foreground shadow-[0_10px_30px_-10px_hsl(160_80%_50%/0.7)]" : "border-border bg-background/60 backdrop-blur hover:-translate-y-0.5 hover:border-emerald-400/50"}`}>
                      <opt.icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className={`text-[11px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.hint}</span>
                    </button>
                  );
                })}
              </div>

              {mode === "org_request" ? (
                <>
                  <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-3 text-xs text-amber-200">
                    ⚠️ Organizacijų paskyros <b>nekuriamos savarankiškai</b>. Pateik prašymą — administratorius patikrins tavo organizaciją ir sukurs paskyrą rankiniu būdu.
                  </div>
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
                        className="mt-1.5 w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none backdrop-blur transition-all focus:border-emerald-400 focus:bg-background focus:shadow-[0_0_0_4px_hsl(160_80%_50%/0.12)]" />
                    </div>
                    <label className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                      <input type="checkbox" checked={confirmReal} onChange={(e) => setConfirmReal(e.target.checked)} className="mt-0.5" />
                      <span>Patvirtinu, kad organizacija egzistuoja realiai, o pateikti duomenys yra teisingi.</span>
                    </label>
                    <motion.button
                      type="submit" disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                      className="group/submit relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(135deg,hsl(160_80%_45%),hsl(var(--primary)))] py-3.5 text-sm font-bold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(160_80%_50%/0.7)] transition-all hover:shadow-[0_20px_60px_-15px_hsl(160_80%_50%/0.9)] disabled:opacity-60"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover/submit:translate-x-full" />
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Siunčiama…</> : <><Send className="h-4 w-4" /> Pateikti prašymą</>}
                    </motion.button>
                  </form>
                </>
              ) : (
                <>
                  {/* OAuth first — parity with login */}
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    <button onClick={handleGoogle} type="button"
                      className="group/btn relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-background/80 py-3 text-sm font-semibold backdrop-blur transition-all hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-[0_10px_30px_-15px_hsl(160_80%_50%/0.6)]">
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                      <GoogleIcon /> Google
                    </button>
                    <button onClick={handleDiscord} type="button"
                      className="group/btn relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-background/80 py-3 text-sm font-semibold backdrop-blur transition-all hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-[0_10px_30px_-15px_hsl(160_80%_50%/0.6)]">
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                      <DiscordIcon /> Discord
                    </button>
                  </div>

                  <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
                    arba el. paštu
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
                  </div>

                  <form className="space-y-4" onSubmit={handleAccountSignup}>
                    <Field label="Vardas Pavardė" icon={User} value={fullName} onChange={setFullName} placeholder="Emilija Kazlauskaitė" required />

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mokykla</label>
                      <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground outline-none backdrop-blur transition-all focus:border-emerald-400 focus:bg-background focus:shadow-[0_0_0_4px_hsl(160_80%_50%/0.12)]">
                        {schools.length === 0 && <option value="">Kraunama…</option>}
                        {schools.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ""}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Klasė</label>
                      <select value={classYear} onChange={(e) => setClassYear(e.target.value)} required
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground outline-none backdrop-blur transition-all focus:border-emerald-400 focus:bg-background focus:shadow-[0_0_0_4px_hsl(160_80%_50%/0.12)]">
                        <option value="">Pasirink…</option>
                        {CLASS_YEARS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 backdrop-blur">
                      <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                        <Clock className="h-4 w-4" /> Kiek valandų turi atlikti?
                      </label>
                      {classYear && isLowerClass(classYear) ? (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="grid h-11 w-24 place-items-center rounded-xl border border-emerald-400/40 bg-emerald-400/10 text-sm font-bold text-emerald-200">20</div>
                          <span className="text-xs text-muted-foreground">val. — <b>5–7 klasėms</b> fiksuota.</span>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-3">
                          <input type="number" min={classYear ? hoursRuleFor(classYear).min : 8} max={500}
                            value={hoursNeeded} required
                            onChange={(e) => setHoursNeeded(Math.max(classYear ? hoursRuleFor(classYear).min : 8, Number(e.target.value)))}
                            className="h-11 w-24 rounded-xl border border-border bg-background px-3 text-center text-sm font-bold outline-none focus:border-emerald-400" />
                          <span className="text-xs text-muted-foreground">val. per metus (min. {classYear ? hoursRuleFor(classYear).min : 8}).</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mokyklos kodas</label>
                      <input type="text" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} required
                        autoComplete="off" placeholder="Pvz.: SEDUVOS2026"
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background/60 px-3 text-sm tracking-wider outline-none backdrop-blur transition-all focus:border-emerald-400 focus:bg-background focus:shadow-[0_0_0_4px_hsl(160_80%_50%/0.12)]" />
                      <p className="mt-1 text-[11px] text-muted-foreground">🔑 Iš klasės auklėtojo / mokyklos administratoriaus.</p>
                    </div>

                    <Field label="El. paštas" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="vardas@mokykla.lt" required />
                    <Field label="Slaptažodis" icon={Lock} type="password" value={password} onChange={setPassword} placeholder="Bent 8 simboliai" required />

                    <label className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 text-[11px] text-muted-foreground backdrop-blur">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
                      <span>Patvirtinu, kad esu tikras mokinys pasirinktoje mokykloje. Melagingi duomenys — paskyros pašalinimas.</span>
                    </label>

                    <motion.button
                      type="submit" disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                      className="group/submit relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(135deg,hsl(160_80%_45%),hsl(var(--primary)))] py-3.5 text-sm font-bold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(160_80%_50%/0.7)] transition-all hover:shadow-[0_20px_60px_-15px_hsl(160_80%_50%/0.9)] disabled:opacity-60"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover/submit:translate-x-full" />
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Kuriama…</> : <>Sukurti paskyrą <ArrowRight className="h-4 w-4 transition-transform group-hover/submit:translate-x-1" /></>}
                    </motion.button>
                  </form>
                </>
              )}

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Jau turi paskyrą?{" "}
                <Link to="/login" className="font-semibold text-emerald-300 hover:underline">Prisijunk</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = "text", required }: {
  label: string; icon: typeof User; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="group/f mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 backdrop-blur transition-all focus-within:border-emerald-400 focus-within:bg-background focus-within:shadow-[0_0_0_4px_hsl(160_80%_50%/0.12)]">
        <Icon className="h-4 w-4 text-muted-foreground transition-colors group-focus-within/f:text-emerald-300" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" placeholder={placeholder} />
      </div>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden fill="#5865F2">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.075.075 0 0 0-.079.037c-.34.607-.719 1.4-.984 2.023a18.29 18.29 0 0 0-5.487 0 12.51 12.51 0 0 0-1-2.023.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.163 4.369a.07.07 0 0 0-.032.027C2.229 8.756 1.431 13.03 1.823 17.253a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.027c.462-.63.874-1.295 1.226-1.995a.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.106c.36.699.772 1.364 1.225 1.994a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-4.887-.838-9.125-3.548-12.857a.061.061 0 0 0-.031-.028zM8.02 14.68c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z"/>
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.5-4.8 9.5-9.3 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
