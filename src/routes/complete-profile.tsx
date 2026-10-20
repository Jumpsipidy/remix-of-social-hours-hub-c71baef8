import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, Heart, Loader2, School } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { registrationComplete } from "@/lib/signup-rules";
import { userError } from "@/lib/user-error";
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
  const [classLetter, setClassLetter] = useState<"A" | "B" | "">("");
  const [fullName, setFullName] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState(20);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.auth.getUser(),
      supabase.from("schools").select("id, name, city").eq("is_active", true).order("name"),
    ]).then(async ([authResult, schoolResult]) => {
      if (!authResult.data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      // Already finished setup (or not a student) → go straight to the dashboard.
      const { data: prof } = await supabase
        .from("profiles")
        .select("role, school_id, class_year, class_letter")
        .eq("id", authResult.data.user.id)
        .maybeSingle();
      const p = prof as { role?: string; school_id?: string | null; class_year?: string | null; class_letter?: string | null } | null;
      if (p && (p.role !== "student" || registrationComplete(p))) {
        window.location.replace(p.role === "student" ? "/student" : "/");
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
    if (!code.trim() || !schoolId || busy) return;
    setBusy(true);
    try {
      await completeSetup({ data: { fullName, schoolId, classYear, classLetter, hoursNeeded, code } });
      toast.success("Mokykla patvirtinta.");
      window.location.assign("/student");
    } catch (error) {
      toast.error(userError(error, "Nepavyko patvirtinti klasės."));
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
            <p className="text-sm text-muted-foreground">Klasės numeris, A/B raidė ir valandos priskiriami pagal tavo klasės kodą.</p>
            <p className="text-sm text-muted-foreground">Privalomos valandos užrakintos pagal klasės kodą.</p>
            <Field label="Klasės kodas" value={code} onChange={setCode} placeholder="MKC-XXXXX-X" />
            <Button className="h-11 w-full" disabled={busy || !code.trim() || !schoolId}>
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