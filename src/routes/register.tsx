import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Mail, Lock, User, GraduationCap, Building2, School, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

type Role = "student" | "school_admin" | "organization";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Registruotis — Socialinės Valandos" },
      { name: "description", content: "Sukurk paskyrą ir pradėk kaupti socialines valandas." },
    ],
  }),
  component: RegisterPage,
});

const ROLES: { id: Role; label: string; icon: typeof GraduationCap; hint: string }[] = [
  { id: "student", label: "Moksleivis", icon: GraduationCap, hint: "Kaupk socialines valandas" },
  { id: "organization", label: "Organizacija", icon: Building2, hint: "Priimk savanorius" },
  { id: "school_admin", label: "Mokyklos administracija", icon: School, hint: "Stebėk klasės progresą" },
];

function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState<number>(40);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            role,
            full_name: role === "organization" ? orgName : fullName,
            organization_name: role === "organization" ? orgName : null,
            hours_needed: role === "student" ? hoursNeeded : 0,
          },
        },
      });
      if (error) throw error;
      toast.success("Paskyra sukurta! Sveiki atvykę.");
      navigate({ to: role === "organization" ? "/organization" : "/student" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nepavyko sukurti paskyros";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Nepavyko prisijungti per Google");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-mesh" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold">Socialinės Valandos</span>
        </Link>

        <div className="w-full rounded-3xl border border-border bg-gradient-card p-8 shadow-elegant">
          <h1 className="text-2xl font-bold">Sukurk paskyrą</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pasirink savo rolę ir užtruks mažiau nei minutę</p>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {ROLES.map((opt) => {
              const active = role === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRole(opt.id)}
                  className={`group flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                      : "border-border bg-background/60 hover:border-primary/50"
                  }`}
                >
                  <opt.icon className="h-5 w-5" />
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className={`text-[11px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.hint}</span>
                </button>
              );
            })}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Field
              label={role === "organization" ? "Organizacijos pavadinimas" : "Vardas Pavardė"}
              icon={role === "organization" ? Building2 : User}
              value={role === "organization" ? orgName : fullName}
              onChange={(v) => (role === "organization" ? setOrgName(v) : setFullName(v))}
              placeholder={role === "organization" ? "Žaliasis Vilnius" : "Emilija Kazlauskaitė"}
              required
            />

            {role === "student" && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Clock className="h-4 w-4" /> Pradinis nustatymas
                </label>
                <p className="mt-1 text-sm font-medium">Kiek socialinių valandų turi atlikti?</p>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={hoursNeeded}
                    onChange={(e) => setHoursNeeded(Math.max(0, Number(e.target.value)))}
                    className="h-11 w-24 rounded-xl border border-border bg-background px-3 text-center text-sm font-bold outline-none focus:border-primary"
                    required
                  />
                  <span className="text-sm text-muted-foreground">valandų per mokslo metus</span>
                </div>
              </div>
            )}

            {role === "school_admin" && (
              <div className="rounded-2xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                <Shield className="mb-1 inline h-4 w-4 text-primary" /> Po registracijos administratorius susies tavo paskyrą su mokyklos ekosistema.
              </div>
            )}

            <Field label="El. paštas" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="vardas@mokykla.lt" required />
            <Field label="Slaptažodis" icon={Lock} type="password" value={password} onChange={setPassword} placeholder="Bent 8 simboliai" required />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Kuriama paskyra..." : "Sukurti paskyrą"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> arba <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold transition hover:bg-muted"
          >
            <GoogleIcon /> Tęsti su Google
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Jau turi paskyrą?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Prisijungti</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, icon: Icon, value, onChange, placeholder, type = "text", required,
}: {
  label: string; icon: typeof User; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="h-11 w-full bg-transparent text-sm outline-none"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.5-4.8 9.5-9.3 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
