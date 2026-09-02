import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "../components/layout";
import { supabase } from "@/integrations/supabase/client";
import { LeafletMap } from "@/components/leaflet-map";
import { MapillaryPreview } from "@/components/mapillary-preview";
import { ProfileSkeleton } from "@/components/skeleton-loader";
import {
  MapPin, Globe, Facebook, Instagram, Mail, Phone, Building2, CheckCircle2,
  Sparkles, ArrowLeft, Clock,
} from "lucide-react";

type OrgPublic = {
  id: string;
  organization_name: string | null;
  full_name: string | null;
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
  profile_verified: boolean;
};

type OrgTask = {
  id: string;
  title: string;
  task_date: string;
  available_hours: number;
  location: string | null;
  is_open: boolean;
};

export const Route = createFileRoute("/org/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Organizacija — Socialinės Valandos` },
      { name: "description", content: `Organizacijos profilis (ID ${params.id}) Socialinės Valandos platformoje.` },
    ],
  }),
  component: OrgPublicPage,
});

function OrgPublicPage() {
  const { id } = Route.useParams();
  const [p, setP] = useState<OrgPublic | null>(null);
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, organization_name, full_name, logo_url, cover_url, gallery_urls, bio, public_email, phone, website_url, facebook_url, instagram_url, address, city, latitude, longitude, activity_tags, profile_verified, role"
        )
        .eq("id", id)
        .maybeSingle();
      if (!data || (data as { role?: string }).role !== "organization") {
        setLoading(false);
        return;
      }
      setP(data as unknown as OrgPublic);
      const { data: t } = await supabase
        .from("tasks")
        .select("id, title, task_date, available_hours, location, is_open")
        .eq("organization_id", id)
        .eq("is_open", true)
        .order("task_date", { ascending: true })
        .limit(6);
      setTasks((t as OrgTask[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageShell><ProfileSkeleton /></PageShell>;
  if (!p) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold">Organizacija nerasta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Šis profilis neegzistuoja arba dar viešai neatidarytas.</p>
          <Link to="/tasks" className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Visos užduotys
          </Link>
        </div>
      </PageShell>
    );
  }

  const name = p.organization_name ?? p.full_name ?? "Organizacija";

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <Link to="/tasks" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Atgal į užduotis
        </Link>

        {/* Cover + logo */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <div className="relative h-40 sm:h-64 bg-gradient-to-br from-slate-800 to-slate-950">
            {p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover opacity-90" />}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </div>
          <div className="flex flex-wrap items-end gap-4 px-6 pb-6">
            <div className="relative -mt-14 h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-4 border-background bg-gradient-primary shadow-glow">
              {p.logo_url ? (
                <img src={p.logo_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-3xl font-bold text-primary-foreground">
                  {name[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[220px] pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
                {p.profile_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="h-3 w-3" /> Patvirtinta
                  </span>
                )}
              </div>
              {p.city && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {p.city}
                </p>
              )}
              {p.activity_tags && p.activity_tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.activity_tags.map((t) => (
                    <span key={t} className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {p.bio && (
              <section className="rounded-3xl border border-border bg-card p-6">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary"><Building2 className="h-4 w-4" /> Apie mus</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{p.bio}</p>
              </section>
            )}

            {p.latitude != null && p.longitude != null && (
              <section className="rounded-3xl border border-border bg-card p-6">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary"><MapPin className="h-4 w-4" /> Kur mus rasti</h2>
                {p.address && <p className="mt-2 text-sm text-muted-foreground">{p.address}</p>}
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <LeafletMap lat={Number(p.latitude)} lng={Number(p.longitude)} height={280} interactive />
                  <MapillaryPreview lat={Number(p.latitude)} lng={Number(p.longitude)} height={280} />
                </div>
              </section>
            )}

            {p.gallery_urls && p.gallery_urls.length > 0 && (
              <section className="rounded-3xl border border-border bg-card p-6">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary"><Sparkles className="h-4 w-4" /> Galerija</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {p.gallery_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="group aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
                      <img src={url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Kontaktai</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {p.public_email && <ContactRow icon={Mail} label={p.public_email} href={`mailto:${p.public_email}`} />}
                {p.phone && <ContactRow icon={Phone} label={p.phone} href={`tel:${p.phone}`} />}
                {p.website_url && <ContactRow icon={Globe} label="Tinklapis" href={p.website_url} />}
                {p.facebook_url && <ContactRow icon={Facebook} label="Facebook" href={p.facebook_url} />}
                {p.instagram_url && <ContactRow icon={Instagram} label="Instagram" href={p.instagram_url} />}
                {!p.public_email && !p.phone && !p.website_url && !p.facebook_url && !p.instagram_url && (
                  <li className="text-xs text-muted-foreground">Kontaktų dar nėra.</li>
                )}
              </ul>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary"><Clock className="h-4 w-4" /> Atviros užduotys</h2>
              <ul className="mt-3 space-y-2">
                {tasks.length === 0 && <li className="text-xs text-muted-foreground">Šiuo metu atvirų užduočių nėra.</li>}
                {tasks.map((t) => (
                  <li key={t.id}>
                    <Link to="/tasks" className="block rounded-2xl border border-border bg-background/60 p-3 transition hover:border-primary/40">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.task_date} · {t.available_hours} val.</p>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/tasks" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
                Visos užduotys
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function ContactRow({ icon: Icon, label, href }: { icon: typeof Mail; label: string; href: string }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl bg-background/60 px-3 py-2 transition hover:bg-accent">
        <Icon className="h-4 w-4 text-primary" />
        <span className="truncate">{label}</span>
      </a>
    </li>
  );
}
