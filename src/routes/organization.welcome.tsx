import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, MapPin, Phone, Mail, Globe, ArrowRight, ArrowLeft, Check, Camera, QrCode, Loader2, Sparkles, Upload, X, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AddressPicker, type AddressValue, SEDUVA_SUGGESTIONS } from "@/components/address-picker";
import { TagsInput } from "@/components/tags-input";
import { completeOrgOnboarding } from "@/lib/org-onboarding.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/organization/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sveiki — organizacijos pradžia — Socialinės Valandos" },
      { name: "description", content: "Pirmieji žingsniai: sukurk organizacijos profilį, paskelbk pirmąją užduotį ir paruošk QR registraciją." },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/organization/welcome" }],
  }),
  component: OrgWelcomePage,
});

const STEPS = ["Profilis", "Pirmoji užduotis", "QR registracija", "Pabaiga"];

const ACTIVITY_SUGGESTIONS = [
  "senjorai", "vaikai", "gyvūnai", "aplinkosauga", "renginiai", "sportas", "kultūra", "švietimas", "sveikata", "bendruomenė", "labdara", "menas",
];

const MAX_LOGO_SIZE = 2 * 1024 * 1024;

type OrgProfile = {
  id: string;
  role: "organization";
  organization_name?: string | null;
  bio?: string | null;
  public_email?: string | null;
  phone?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  activity_tags?: string[];
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function OrgWelcomePage() {
  const { profile, isAuthenticated } = useAuth();
  const user = profile;
  const navigate = useNavigate();
  const submit = useServerFn(completeOrgOnboarding);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Profile
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState<AddressValue | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDate, setTaskDate] = useState(todayISO());
  const [taskStart, setTaskStart] = useState("14:00");
  const [taskEnd, setTaskEnd] = useState("17:00");
  const [taskHours, setTaskHours] = useState(3);
  const [taskSpots, setTaskSpots] = useState(5);
  const [taskAddress, setTaskAddress] = useState<AddressValue | null>(null);
  const [taskLocation, setTaskLocation] = useState("");
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [addTask, setAddTask] = useState(true);

  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!user || user.role !== "organization") return;
    if (user.organization_name) setName(user.organization_name);
    if (user.bio) setBio(user.bio);
    if (user.public_email) setEmail(user.public_email);
    if (user.phone) setPhone(user.phone);
    if (user.website_url) setWebsite(user.website_url);
    if (user.logo_url) setLogoUrl(user.logo_url);
    if (user.activity_tags) setTags(user.activity_tags);
    if (user.address && user.latitude && user.longitude) {
      setAddress({ address: user.address, city: user.city, latitude: user.latitude, longitude: user.longitude });
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!user || user.role !== "organization") {
      navigate({ to: "/register" });
    }
  }, [isAuthenticated, user, navigate]);

  const handleUploadLogo = async (file: File | null | undefined) => {
    if (!file || !user?.id) return;
    if (!file.type.startsWith("image/")) return toast.error("Įkelk paveikslėlį.");
    if (file.size > MAX_LOGO_SIZE) return toast.error("Logotipas per didelis — iki 2 MB.");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/logo-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("org-logos").upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type,
      });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage.from("org-logos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !data) throw signErr ?? new Error("Signed URL failed");
      setLogoUrl(data.signedUrl);
      toast.success("Logotipas įkeltas");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return name.trim().length >= 2 && (email === "" || email.includes("@"));
    if (step === 1) return !addTask || (taskTitle.trim().length >= 3 && taskDate && taskHours > 0 && taskHours <= 8);
    return true;
  };

  const finish = async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const result = await submit({
        data: {
          organization_name: name.trim(),
          bio: bio.trim() || undefined,
          public_email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          website_url: website.trim() || undefined,
          address: address?.address || undefined,
          city: address?.city || undefined,
          latitude: address?.latitude ?? null,
          longitude: address?.longitude ?? null,
          logo_url: logoUrl || undefined,
          activity_tags: tags,
          first_task: addTask ? {
            title: taskTitle.trim(),
            description: taskDesc.trim() || undefined,
            task_date: taskDate,
            start_time: taskStart,
            end_time: taskEnd,
            available_hours: taskHours,
            location: taskLocation.trim() || taskAddress?.address || undefined,
            address: taskAddress?.address || undefined,
            latitude: taskAddress?.latitude ?? null,
            longitude: taskAddress?.longitude ?? null,
            spots_total: taskSpots,
            tags: taskTags,
          } : undefined,
        },
      });
      if (result.ok) {
        toast.success("Organizacija paruošta! 🎉");
        navigate({ to: "/organization" });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!user || user.role !== "organization") return null;

  return (
    <div className="min-h-screen bg-background pb-24 pt-6 sm:pb-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          ← Grįžti į pradžią
        </Link>
        <h1 className="font-display text-2xl font-black sm:text-4xl">Sveiki atvykę į organizacijos sritį</h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">Per kelias minutes sukursi viešą profilį, kurį matys mokiniai, ir paskelbsi pirmąją savanorystės užduotį.</p>

        {/* Progress */}
        <div className="mt-8">
          <div className="mb-2 flex justify-between text-xs font-semibold text-muted-foreground">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? "text-primary" : ""}>{i + 1}. {s}</span>
            ))}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full bg-gradient-primary" initial={{ width: 0 }} animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>

        <div className="mt-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md sm:p-8"
              >
                <div className="flex items-center gap-2 text-lg font-bold"><Building2 className="h-5 w-5 text-primary" /> Organizacijos profilis</div>
                <p className="text-xs text-muted-foreground">Šiuos duomenis matys mokiniai, ieškantys savanorystės.</p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => logoRef.current?.click()} className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl border border-border bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-glow transition hover:opacity-90">
                      {logoUrl ? <img src={logoUrl} alt="Logotipas" className="h-full w-full object-cover" /> : (name.trim()[0] || "?")}
                      {uploading && <Loader2 className="absolute h-6 w-6 animate-spin" />}
                    </button>
                    <div>
                      <button onClick={() => logoRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-semibold border border-border hover:bg-accent">
                      <Camera className="h-3.5 w-3.5" /> Įkelti logotipą</button>
                      <p className="mt-1 text-[11px] text-muted-foreground">Rekomenduojama 1:1, iki 2 MB.</p>
                      {logoUrl && <button onClick={() => setLogoUrl(null)} className="mt-1 inline-flex items-center gap-1 text-[11px] text-destructive hover:underline"><X className="h-3 w-3" /> Pašalinti</button>}
                    </div>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void handleUploadLogo(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                  </div>

                  <Field label="Pavadinimas" value={name} onChange={setName} placeholder="VšĮ Šeduvos pagalba" required />
                  <Field label="Trumpas aprašymas" value={bio} onChange={setBio} placeholder="Kuo užsiima organizacija?" />
                  <Field label="El. paštas kontaktams" type="email" value={email} onChange={setEmail} placeholder="info@organizacija.lt" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Telefonas" value={phone} onChange={setPhone} placeholder="+370 6XX XXXXX" />
                    <Field label="Svetainė" value={website} onChange={setWebsite} placeholder="https://..." />
                  </div>
                  <TagsInput value={tags} onChange={setTags} suggestions={ACTIVITY_SUGGESTIONS} hint="Pasirink veiklos sritis, kad mokiniai tave rastų" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Būstinės / pagrindinė vieta</p>
                    <AddressPicker
                      initial={{ address: address?.address, latitude: address?.latitude, longitude: address?.longitude }}
                      onChange={(v) => setAddress(v)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md sm:p-8"
              >
                <div className="flex items-center gap-2 text-lg font-bold"><Leaf className="h-5 w-5 text-primary" /> Pirmoji užduotis</div>
                <p className="text-xs text-muted-foreground">Kuo mokiniai galės pradėti? Vėliau galėsi pridėti daugiau.</p>

                <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background/60 p-4">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={addTask} onChange={(e) => setAddTask(e.target.checked)} />
                  <span className="text-sm font-medium">Sukurti pirmąją užduotį dabar</span>
                </label>

                {addTask && (
                  <div className="mt-4 space-y-4">
                    <Field label="Pavadinimas" value={taskTitle} onChange={setTaskTitle} placeholder="Pagalba bibliotekoje / renginio organizavimas" required />
                    <textarea
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      rows={3}
                      placeholder="Ką darys savanoris? Kokie įgūdžiai praverstų?"
                      className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <LabeledInput label="Data" type="date" value={taskDate} min={todayISO()} onChange={setTaskDate} />
                      <LabeledInput label="Pradžia" type="time" value={taskStart} onChange={setTaskStart} />
                      <LabeledInput label="Pabaiga" type="time" value={taskEnd} onChange={setTaskEnd} />
                      <LabeledInput label="Valandos" type="number" min={1} max={8} value={String(taskHours)} onChange={(v) => setTaskHours(Math.min(8, Math.max(1, Number(v) || 1)))} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input
                        value={taskLocation}
                        onChange={(e) => setTaskLocation(e.target.value)}
                        placeholder="Vietos pavadinimas (pvz., Šeduvos biblioteka)"
                        className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                        <span className="text-xs text-muted-foreground">Vietų</span>
                        <input type="number" min={1} value={taskSpots} onChange={(e) => setTaskSpots(Math.max(1, Number(e.target.value) || 1))} className="h-11 w-16 bg-transparent text-sm outline-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tikslus adresas</p>
                      <AddressPicker
                        initial={{ address: taskAddress?.address, latitude: taskAddress?.latitude, longitude: taskAddress?.longitude }}
                        onChange={(v) => setTaskAddress(v)}
                      />
                    </div>
                    <TagsInput value={taskTags} onChange={setTaskTags} hint="Padės mokiniams atrasti šią užduotį" />
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md sm:p-8"
              >
                <div className="flex items-center gap-2 text-lg font-bold"><QrCode className="h-5 w-5 text-primary" /> QR registracija</div>
                <p className="text-xs text-muted-foreground">Kai mokinys atvyks, nuskaitysi jo QR kodą arba įvesi 6 skaitmenų kodą.</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/60 p-5">
                    <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-primary/10"><QrCode className="h-5 w-5 text-primary" /></div>
                    <h3 className="font-semibold">1. Mokinys atidaro QR kodą</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Jei internetas geras — 30 s rotuojantis QR. Jei ne — 6 skaitmenų atsarginis kodas.</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/60 p-5">
                    <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-primary/10"><Camera className="h-5 w-5 text-primary" /></div>
                    <h3 className="font-semibold">2. Tu nuskaitysi savo telefonu</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Eik į /organization/scan arba paspausk „Skenuoti" apačioje.</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-primary">Praktinis patarimas</p>
                  <p className="mt-1 text-xs text-muted-foreground">Pirmą kartą rekomenduojame pasitikrinti su savo įrenginiu — atidaryk /organization/scan ir patikrink, ar kamera įsijungia.</p>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="rounded-3xl border border-border bg-gradient-card p-6 text-center shadow-md sm:p-8"
              >
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-primary shadow-glow">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
                <h2 className="mt-4 font-display text-2xl font-black">Viskas paruošta!</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  {addTask
                    ? `Paskelbsi organizaciją „${name.trim()}“ ir pirmąją užduotį. Vėliau viską galėsi redaguoti srities „Organizacija“ pulte.`
                    : `Išsaugosime organizacijos profilį. Užduotis sukursi pulte, kai bus patogu.`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-accent disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Atgal
          </button>
          {step < STEPS.length - 1 ? (
            <button
              disabled={!canNext() || busy}
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
            >
              Toliau <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={finish}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {busy ? "Saugojama…" : "Baigti ir paskelbti"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label} {required && <span className="text-primary">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function LabeledInput({ label, type = "text", value, min, max, onChange }: { label: string; type?: string; value: string; min?: string; max?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
