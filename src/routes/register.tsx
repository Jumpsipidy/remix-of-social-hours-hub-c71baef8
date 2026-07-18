import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Mail, Lock, User, GraduationCap, School, Building2, Clock, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Auth3DBackground } from "@/components/auth-3d-background";

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

function RegisterPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("student");
  const [schools, setSchools] = useState<SchoolRow[]>([]);

  // Common
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Student
  const [schoolId, setSchoolId] = useState("");
  const [classYear, setClassYear] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState(20);
  const [schoolCode, setSchoolCode] = useState("");
  const [agree, setAgree] = useState(false);


  // Org request
  const [orgName, setOrgName] = useState("");
  const [legalCode, setLegalCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [confirmReal, setConfirmReal] = useState(false);

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
      // Verify school code BEFORE creating the account
      const { data: ok, error: rpcErr } = await supabase.rpc("verify_school_signup_code", {
        _school_id: schoolId, _code: schoolCode.trim(),
      });
      if (rpcErr || !ok) { toast.error("Neteisingas mokyklos kodas. Gauk jį iš klasės auklėtojo."); return; }
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
            hours_needed: mode === "student" ? hoursNeeded : 0,
            school_id: mode === "student" ? schoolId : null,
            class_year: mode === "student" ? classYear : null,
          },
        },
      });
      if (error) throw error;
      if (mode === "student" && signUp.user) {
        await supabase.from("profiles").update({ school_id: schoolId, class_year: classYear }).eq("id", signUp.user.id);
      }
      toast.success("Paskyra sukurta! Sveiki atvykę.");
      navigate({ to: "/student" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko sukurti paskyros");
    } finally { setLoading(false); }
  }


  async function handleOrgRequest(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!confirmReal) {
      toast.error("Patvirtink, kad pateikta informacija yra tikra.");
      return;
    }
    if (orgName.trim().length < 3 || description.trim().length < 30) {
      toast.error("Užpildyk visus laukelius (aprašymas – bent 30 simbolių).");
      return;
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/student` },
    });
    if (error) toast.error("Nepavyko prisijungti per Google");
  }

  async function handleDiscord() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/student` },
    });
    if (error) toast.error("Nepavyko prisijungti per Discord");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Auth3DBackground />
      <div className="absolute inset-0 bg-gradient-mesh opacity-40" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold">Socialinės Valandos</span>
        </Link>

        <div className="w-full rounded-3xl border border-border bg-gradient-card p-8 shadow-elegant">
          <h1 className="text-2xl font-bold">Sukurk paskyrą</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pasirink kas esi</p>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {([
              { k: "student", label: "Moksleivis", icon: GraduationCap, hint: "Kaupk valandas" },
              { k: "org_request", label: "Organizacija", icon: Building2, hint: "Pateik prašymą" },
            ] as { k: Mode; label: string; icon: typeof GraduationCap; hint: string }[]).map((opt) => {
              const active = mode === opt.k;
              return (
                <button key={opt.k} type="button" onClick={() => setMode(opt.k)}
                  className={`group flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${active ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow" : "border-border bg-background/60 hover:border-primary/50"}`}>
                  <opt.icon className="h-5 w-5" />
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className={`text-[11px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.hint}</span>
                </button>
              );
            })}
          </div>

          {mode === "org_request" ? (
            <>
              <div className="mt-4 rounded-2xl border border-warning/40 bg-warning/5 p-3 text-xs text-warning-foreground">
                ⚠️ Organizacijų paskyros <b>nekuriamos savarankiškai</b>. Pateik prašymą — administratorius patikrins tavo organizaciją ir sukurs paskyrą rankiniu būdu.
                Fiktyvūs prašymai (išgalvoti pavadinimai, netikri kodai) yra atmetami ir gali užtraukti atsakomybę.
              </div>
              <form onSubmit={handleOrgRequest} className="mt-5 space-y-4">
                <Field label="Organizacijos pavadinimas (tikslus, kaip Registrų centre)" icon={Building2} value={orgName} onChange={setOrgName} placeholder="VšĮ „Žalioji Karta“" required />
                <Field label="Juridinio asmens kodas" icon={Building2} value={legalCode} onChange={setLegalCode} placeholder="123456789" />
                <Field label="Kontaktinis asmuo (vardas pavardė)" icon={User} value={fullName} onChange={setFullName} placeholder="Jonas Jonaitis" required />
                <Field label="Kontaktinis el. paštas" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="info@organizacija.lt" required />
                <Field label="Telefonas" icon={Mail} value={contactPhone} onChange={setContactPhone} placeholder="+370 6xx xxxxx" />
                <Field label="Interneto svetainė / socialiniai" icon={Mail} value={website} onChange={setWebsite} placeholder="https://…" />
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Trumpas veiklos aprašymas (min. 30 simb.)</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} required
                    placeholder="Kokia veikla užsiimate, kokias užduotis norite pasiūlyti moksleiviams…"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
                </div>
                <label className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                  <input type="checkbox" checked={confirmReal} onChange={(e) => setConfirmReal(e.target.checked)} className="mt-0.5" />
                  <span>Patvirtinu, kad organizacija egzistuoja realiai, o pateikti duomenys yra teisingi. Suprantu, kad melagingos informacijos pateikimas užtraukia atsakomybę.</span>
                </label>
                <button type="submit" disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-60">
                  <Send className="h-4 w-4" /> {loading ? "Siunčiama…" : "Pateikti prašymą"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                Mokyklos administratorių paskyras kuria tik Super Admin per administravimo skydą.
              </div>
              <form className="mt-5 space-y-4" onSubmit={handleAccountSignup}>
                <Field label="Vardas Pavardė" icon={User} value={fullName} onChange={setFullName} placeholder="Emilija Kazlauskaitė" required />

                {mode === "student" && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Mokykla</label>
                      <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary">
                        {schools.length === 0 && <option value="">Kraunama…</option>}
                        {schools.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ""}</option>)}
                      </select>
                      <p className="mt-1 text-[11px] text-muted-foreground">Kol kas prieinama tik viena mokykla. Kitos bus pridedamos administratoriaus.</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Klasė</label>
                      <select value={classYear} onChange={(e) => setClassYear(e.target.value)} required
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary">
                        <option value="">Pasirink…</option>
                        {CLASS_YEARS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <Clock className="h-4 w-4" /> Kiek valandų turi atlikti?
                      </label>
                      <div className="mt-3 flex items-center gap-3">
                        <input type="number" min={1} max={500} value={hoursNeeded} required
                          onChange={(e) => setHoursNeeded(Math.max(0, Number(e.target.value)))}
                          className="h-11 w-24 rounded-xl border border-border bg-background px-3 text-center text-sm font-bold outline-none focus:border-primary" />
                        <span className="text-sm text-muted-foreground">val. per mokslo metus</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Mokyklos prisijungimo kodas</label>
                      <input type="text" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} required
                        autoComplete="off" placeholder="Pvz.: SEDUVOS2026"
                        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm tracking-wider outline-none focus:border-primary" />
                      <p className="mt-1 text-[11px] text-muted-foreground">🔑 Gauk iš klasės auklėtojo arba mokyklos administratoriaus. Be jo paskyros neaktyvuosime.</p>
                    </div>
                    <label className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 text-[11px] text-muted-foreground">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
                      <span>Patvirtinu, kad esu tikras mokinys pasirinktoje mokykloje ir pateikti duomenys yra teisingi. Melagingi duomenys — paskyros pašalinimas.</span>
                    </label>
                  </>
                )}


                <Field label="El. paštas" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="vardas@mokykla.lt" required />
                <Field label="Slaptažodis" icon={Lock} type="password" value={password} onChange={setPassword} placeholder="Bent 8 simboliai" required />

                <button type="submit" disabled={loading}
                  className="w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-60">
                  {loading ? "Kuriama paskyra..." : "Sukurti paskyrą"}
                </button>
              </form>

              {mode === "student" && (
                <>
                  <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <div className="h-px flex-1 bg-border" /> arba <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button onClick={handleGoogle} type="button"
                      className="relative flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold hover:bg-muted">
                      <GoogleIcon /> Tęsti su Google
                      <span className="absolute -top-2 right-3 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">Beta</span>
                    </button>
                    <button onClick={handleDiscord} type="button"
                      className="flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold hover:bg-muted">
                      <DiscordIcon /> Tęsti su Discord
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">Po pirmo prisijungimo galėsi pakeisti savo vardą profilyje.</p>
                </>
              )}
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Jau turi paskyrą?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Prisijungti</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = "text", required }: {
  label: string; icon: typeof User; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
          className="h-11 w-full bg-transparent text-sm outline-none" placeholder={placeholder} />
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
