import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, Heart, Loader2, School } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { completeOAuthStudentSetup } from "@/lib/school-signup.functions";

const CLASS_YEARS = ["5", "6", "7", "8", "9 / I gimn.", "10 / II gimn.", "11 / III gimn.", "12 / IV gimn."] as const;
type SchoolRow = { id: string; name: string; city: string | null };

export const Route = createFileRoute("/complete-profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Užbaik registraciją — Socialinės Valandos" },
      { name: "description", content: "Patvirtink mokyklą ir klasę, kad galėtum naudotis mokinio paskyra." },
      { property: "og:title", content: "Užbaik registraciją — Socialinės Valandos" },
      { property: "og:description", content: "Saugus mokinio paskyros mokyklos patvirtinimas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const navigate = useNavigate();
  const completeSetup = useServerFn(completeOAuthStudentSetup);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [classYear, setClassYear] = useState<(typeof CLASS_YEARS)[number] | "">("");
  const [fullName, setFullName] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState(20);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.auth.getUser(),
      supabase.from("schools").select("id, name, city").eq("is_active", true).order("name"),
    ]).then(([authResult, schoolResult]) => {
      if (!authResult.data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const metadata = authResult.data.user.user_metadata;
      setFullName(String(metadata.full_name ?? metadata.name ?? ""));
      const rows = (schoolResult.data as SchoolRow[] | null) ?? [];
      setSchools(rows);
      setSchoolId(rows[0]?.id ?? "");
    });
  }, [navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!classYear || !schoolId || busy) return;
    setBusy(true);
    try {
      await completeSetup({ data: { fullName, schoolId, classYear, hoursNeeded, code } });
      toast.success("Mokykla patvirtinta.");
      window.location.assign("/student");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko patvirtinti mokyklos.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground"><Heart className="h-4 w-4" fill="currentColor" /></span>
          Socialinės Valandos
        </Link>
        <div className="border-y border-border py-8">
          <School className="h-7 w-7 text-primary" />
          <h1 className="mt-4 text-3xl font-bold">Užbaik mokinio registraciją</h1>
          <p className="mt-2 text-sm text-muted-foreground">Socialinis prisijungimas patvirtino tapatybę. Dabar patvirtink mokyklą ir klasę.</p>
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <Field label="Vardas ir pavardė" value={fullName} onChange={setFullName} />
            <label className="block text-sm font-semibold">Mokykla
              <select className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 font-normal" value={schoolId} onChange={(event) => setSchoolId(event.target.value)} required>
                {schools.map((school) => <option key={school.id} value={school.id}>{school.name}{school.city ? ` (${school.city})` : ""}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Klasė
              <select className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 font-normal" value={classYear} onChange={(event) => setClassYear(event.target.value as typeof classYear)} required>
                <option value="">Pasirink klasę</option>
                {CLASS_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            {classYear && !["5", "6", "7"].includes(classYear) && <label className="block text-sm font-semibold">Reikalingos valandos
              <input type="number" min={8} max={500} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 font-normal" value={hoursNeeded} onChange={(event) => setHoursNeeded(Number(event.target.value))} required />
            </label>}
            <Field label="Mokyklos kodas" value={code} onChange={setCode} placeholder="Pvz.: SEDUVA2026" />
            <Button className="h-11 w-full" disabled={busy || !classYear || !schoolId}>
              {busy ? <><Loader2 className="animate-spin" /> Tikrinama…</> : <><GraduationCap /> Patvirtinti ir tęsti</>}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-sm font-semibold">{label}<input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 font-normal" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required /></label>;
}