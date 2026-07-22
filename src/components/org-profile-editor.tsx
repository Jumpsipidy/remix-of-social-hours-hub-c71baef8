import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Image as ImageIcon, Upload, Trash2, Save, Building2, Globe, Facebook,
  Instagram, Phone, Mail, Tag, MapPin, X, Loader2,
} from "lucide-react";
import { AddressPicker } from "./address-picker";
import { LeafletMap } from "./leaflet-map";
import { MapillaryPreview } from "./mapillary-preview";

type OrgProfile = {
  id: string;
  organization_name: string | null;
  logo_url: string | null;
  cover_url: string | null;
  gallery_urls: string[] | null;
  bio: string | null;
  public_email: string | null;
  phone: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  activity_tags: string[] | null;
};

const ACTIVITY_SUGGESTIONS = [
  "senjorai", "vaikai", "gyvūnai", "aplinkosauga",
  "renginiai", "sportas", "kultūra", "švietimas",
  "sveikata", "bendruomenė", "labdara", "menas",
];

async function uploadImage(bucket: "org-logos" | "org-photos", userId: string, file: File, subfolder = "") {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${subfolder}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type,
  });
  if (error) throw error;
  // Buckets are private (workspace policy blocks public buckets) — use long-lived signed URL (~1 year).
  const { data, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr || !data) throw signErr ?? new Error("Signed URL failed");
  return data.signedUrl;
}

export function OrgProfileEditor({ userId }: { userId: string }) {
  const [p, setP] = useState<OrgProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState("");

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) setP(data as unknown as OrgProfile);
  };
  useEffect(() => { load(); }, [userId]);

  if (!p) return <div className="p-8 text-sm text-muted-foreground">Kraunama profilio anketa…</div>;

  const update = (patch: Partial<OrgProfile>) => setP((cur) => (cur ? { ...cur, ...patch } : cur));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      organization_name: p.organization_name,
      logo_url: p.logo_url,
      cover_url: p.cover_url,
      gallery_urls: p.gallery_urls ?? [],
      bio: p.bio,
      public_email: p.public_email,
      phone: p.phone,
      website_url: p.website_url,
      facebook_url: p.facebook_url,
      instagram_url: p.instagram_url,
      address: p.address,
      city: p.city,
      latitude: p.latitude,
      longitude: p.longitude,
      activity_tags: p.activity_tags ?? [],
    }).eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profilis išsaugotas ✨");
  };

  const handleUpload = async (
    kind: "logo" | "cover" | "gallery",
    file: File | null | undefined,
  ) => {
    if (!file) return;
    setUploading(kind);
    try {
      if (kind === "logo") {
        const url = await uploadImage("org-logos", userId, file);
        update({ logo_url: url });
      } else if (kind === "cover") {
        const url = await uploadImage("org-photos", userId, file, "covers/");
        update({ cover_url: url });
      } else {
        const url = await uploadImage("org-photos", userId, file, "gallery/");
        update({ gallery_urls: [...(p.gallery_urls ?? []), url] });
      }
      toast.success("Nuotrauka įkelta");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const removeGallery = (url: string) => {
    update({ gallery_urls: (p.gallery_urls ?? []).filter((u) => u !== url) });
  };

  const addTag = (t: string) => {
    const clean = t.trim().toLowerCase();
    if (!clean) return;
    const cur = p.activity_tags ?? [];
    if (cur.includes(clean)) return;
    update({ activity_tags: [...cur, clean].slice(0, 12) });
    setTagInput("");
  };

  const removeTag = (t: string) => update({ activity_tags: (p.activity_tags ?? []).filter((x) => x !== t) });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold"><Building2 className="h-5 w-5 text-primary" /> Mano organizacijos profilis</h2>
          <p className="text-sm text-muted-foreground">Ką matys mokiniai, kai atsidarys tavo viešą profilį.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Išsaugoti pakeitimus
        </button>
      </div>

      {/* Cover + logo */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative h-40 sm:h-56 bg-gradient-to-br from-slate-800 to-slate-900">
          {p.cover_url && <img src={p.cover_url} alt="Organizacijos profilio viršelio nuotrauka" className="h-full w-full object-cover" />}
          <button
            onClick={() => coverRef.current?.click()}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80"
          >
            {uploading === "cover" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Įkelti viršelį (16:9)
          </button>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload("cover", e.target.files?.[0])} />
        </div>
        <div className="flex flex-wrap items-end gap-4 px-6 pb-6">
          <div className="relative -mt-10 h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-background bg-gradient-primary shadow-glow">
            {p.logo_url ? (
              <img src={p.logo_url} alt="Organizacijos profilio logotipas" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-2xl font-bold text-primary-foreground">
                {(p.organization_name ?? "?")[0]}
              </div>
            )}
            <button
              onClick={() => logoRef.current?.click()}
              className="absolute inset-0 grid place-items-center bg-black/60 opacity-0 transition hover:opacity-100"
            >
              {uploading === "logo" ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Upload className="h-5 w-5 text-white" />}
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload("logo", e.target.files?.[0])} />
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-semibold text-muted-foreground">Organizacijos pavadinimas</label>
            <input
              value={p.organization_name ?? ""}
              onChange={(e) => update({ organization_name: e.target.value })}
              placeholder="Pvz. Maisto bankas"
              className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <label className="text-sm font-semibold">Apie mus</label>
        <p className="text-xs text-muted-foreground">Ką jūsų organizacija veikia, kokį darbą mokiniai atliks. Iki 1000 simbolių.</p>
        <textarea
          value={p.bio ?? ""}
          onChange={(e) => update({ bio: e.target.value.slice(0, 1000) })}
          rows={5}
          placeholder="Trumpai apie organizaciją, veiklas, ką reiškia savanoriauti pas mus…"
          className="mt-3 w-full resize-y rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{(p.bio ?? "").length}/1000</p>
      </div>

      {/* Contacts */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
          <Phone className="h-4 w-4" /> Kontaktai
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field icon={Mail} label="Viešas el. paštas" value={p.public_email ?? ""} onChange={(v) => update({ public_email: v })} placeholder="info@maisto-bankas.lt" />
          <Field icon={Phone} label="Telefonas" value={p.phone ?? ""} onChange={(v) => update({ phone: v })} placeholder="+370 6xx xxxxx" />
          <Field icon={Globe} label="Tinklapis" value={p.website_url ?? ""} onChange={(v) => update({ website_url: v })} placeholder="https://..." />
          <Field icon={Facebook} label="Facebook" value={p.facebook_url ?? ""} onChange={(v) => update({ facebook_url: v })} placeholder="https://facebook.com/..." />
          <Field icon={Instagram} label="Instagram" value={p.instagram_url ?? ""} onChange={(v) => update({ instagram_url: v })} placeholder="https://instagram.com/..." />
        </div>
      </div>

      {/* Address + map */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
          <MapPin className="h-4 w-4" /> Vieta
        </h3>
        <AddressPicker
          initial={{ address: p.address ?? undefined }}
          onChange={(v) => update({ address: v.address, city: v.city, latitude: v.latitude, longitude: v.longitude })}
        />
        {p.latitude != null && p.longitude != null && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Žemėlapis · spausk žemėlapyje, kad tiksliai nustatytum tašką</p>
              <LeafletMap
                lat={Number(p.latitude)}
                lng={Number(p.longitude)}
                zoom={16}
                height={280}
                onPick={(c) => update({ latitude: c.lat, longitude: c.lng })}
              />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gatvės vaizdas · Mapillary</p>
              <MapillaryPreview lat={Number(p.latitude)} lng={Number(p.longitude)} height={280} />
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
          <Tag className="h-4 w-4" /> Veiklos sritys
        </h3>
        <div className="flex flex-wrap gap-2">
          {(p.activity_tags ?? []).map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              #{t}
              <button onClick={() => removeTag(t)} aria-label={`Pašalinti ${t}`} className="ml-1 rounded-full hover:bg-primary/20"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
            placeholder="Pridėk žymą ir spausk Enter"
            className="flex-1 rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <button onClick={() => addTag(tagInput)} className="rounded-2xl border border-border bg-background px-4 text-sm font-semibold hover:bg-accent">Pridėti</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ACTIVITY_SUGGESTIONS.filter((s) => !(p.activity_tags ?? []).includes(s)).map((s) => (
            <button key={s} onClick={() => addTag(s)} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground">+ {s}</button>
          ))}
        </div>
      </div>

      {/* Gallery */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <ImageIcon className="h-4 w-4" /> Galerija ({(p.gallery_urls ?? []).length}/6)
          </h3>
          <button
            onClick={() => galleryRef.current?.click()}
            disabled={(p.gallery_urls ?? []).length >= 6 || uploading === "gallery"}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50"
          >
            {uploading === "gallery" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Įkelti nuotrauką
          </button>
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload("gallery", e.target.files?.[0])} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(p.gallery_urls ?? []).map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              <img src={url} alt="Organizacijos veiklos galerijos nuotrauka" className="h-full w-full object-cover" />
              <button
                onClick={() => removeGallery(url)}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100 hover:bg-destructive"
                aria-label="Šalinti nuotrauką"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {(p.gallery_urls ?? []).length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Dar nėra nuotraukų. Įkelk iki 6 iš organizacijos veiklos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
      />
    </label>
  );
}
