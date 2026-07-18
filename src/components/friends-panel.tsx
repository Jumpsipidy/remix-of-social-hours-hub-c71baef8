import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, Check, X, Users, Clock, Loader2, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyFriendships, fetchFriendProfiles, searchClassmates,
  sendFriendRequest, respondToRequest, unfriend,
  type FriendshipRow, type FriendProfile,
} from "@/lib/friends";
import { DmDialog } from "./dm-dialog";

type Props = { userId: string; schoolId: string | null };

export function FriendsPanel({ userId, schoolId }: Props) {
  const [rows, setRows] = useState<FriendshipRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, FriendProfile>>({});
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dmFriend, setDmFriend] = useState<{ id: string; name: string } | null>(null);

  const reload = async () => {
    try {
      const r = await listMyFriendships(userId);
      setRows(r);
      const ids = Array.from(new Set(r.flatMap((x) => [x.requester_id, x.addressee_id]).filter((i) => i !== userId)));
      const p = await fetchFriendProfiles(ids);
      setProfiles(p);
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko įkelti draugų");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [userId]);

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel(`friendships-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [userId]);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await searchClassmates(userId, schoolId, q);
        if (!cancelled) setResults(list);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, schoolId, userId]);

  const accepted = useMemo(() => rows.filter((r) => r.status === "accepted"), [rows]);
  const incoming = useMemo(() => rows.filter((r) => r.status === "pending" && r.addressee_id === userId), [rows, userId]);
  const outgoing = useMemo(() => rows.filter((r) => r.status === "pending" && r.requester_id === userId), [rows, userId]);

  const relationTo = (id: string) => rows.find(
    (r) => (r.requester_id === userId && r.addressee_id === id) || (r.addressee_id === userId && r.requester_id === id)
  );

  const handleSend = async (target: FriendProfile) => {
    try {
      await sendFriendRequest(userId, target.id);
      toast.success(`Užklausa išsiųsta: ${target.full_name ?? "moksleivis"}`);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko išsiųsti");
    }
  };

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      await respondToRequest(id, accept);
      toast.success(accept ? "Draugystė patvirtinta" : "Užklausa atmesta");
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Klaida"); }
  };

  const handleUnfriend = async (id: string, name: string) => {
    if (!confirm(`Panaikinti draugystę su ${name}?`)) return;
    try {
      await unfriend(id);
      reload();
    } catch (e: any) { toast.error(e?.message ?? "Klaida"); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Kraunama...</div>;
  }

  if (!schoolId) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
      Pasirink mokyklą savo profilyje, kad galėtum susirasti klasiokų.
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Search / add */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary"><UserPlus className="h-4 w-4" /></div>
          <div>
            <p className="text-sm font-semibold">Susirask klasiokus</p>
            <p className="text-xs text-muted-foreground">Ieškok iš savo mokyklos ir pridėk kaip draugus</p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Vardas, pvz. Jonas"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="mt-3 space-y-2">
          {searching && <p className="text-xs text-muted-foreground">Ieškoma…</p>}
          {!searching && results.length === 0 && q.trim() && <p className="text-xs text-muted-foreground">Niekas nerastas</p>}
          <AnimatePresence>
            {results.map((p) => {
              const rel = relationTo(p.id);
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.full_name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.class_year ?? "—"} · {p.hours_earned ?? 0} val.</p>
                  </div>
                  {rel?.status === "accepted" ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">Draugas</span>
                  ) : rel?.status === "pending" && rel.requester_id === userId ? (
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-500">Išsiųsta</span>
                  ) : rel?.status === "pending" && rel.addressee_id === userId ? (
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Laukia tavo atsakymo</span>
                  ) : (
                    <button
                      onClick={() => handleSend(p)}
                      className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
                    >
                      <Send className="h-3 w-3" /> Pridėti
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section className="rounded-3xl border border-primary/30 bg-primary/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Gautos užklausos ({incoming.length})</p>
          </div>
          <div className="space-y-2">
            {incoming.map((r) => {
              const p = profiles[r.requester_id];
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{p?.class_year ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRespond(r.id, true)} className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600">
                      <Check className="h-3 w-3" /> Priimti
                    </button>
                    <button onClick={() => handleRespond(r.id, false)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent">
                      <X className="h-3 w-3" /> Atmesti
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Friends list */}
      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Mano draugai ({accepted.length})</p>
        </div>
        {accepted.length === 0 ? (
          <p className="text-xs text-muted-foreground">Kol kas neturi draugų. Susirask klasiokų viršuje.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {accepted.map((r) => {
              const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
              const p = profiles[otherId];
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                      {(p?.full_name ?? "?").trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p?.full_name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{p?.class_year ?? "—"} · {p?.hours_earned ?? 0} val.</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => setDmFriend({ id: otherId, name: p?.full_name ?? "Draugas" })}
                      className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-glow"
                      title="Žinutės (auto-ištrinamos po 2 d.)"
                    >
                      <MessageCircle className="h-3 w-3" /> Rašyti
                    </button>
                    <button onClick={() => handleUnfriend(r.id, p?.full_name ?? "draugas")} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                      Pašalinti
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Outgoing */}
      {outgoing.length > 0 && (
        <section className="rounded-3xl border border-border bg-card/60 p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Išsiųstos užklausos</p>
          <div className="space-y-1.5">
            {outgoing.map((r) => {
              const p = profiles[r.addressee_id];
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{p?.full_name ?? "—"}</span>
                  <button onClick={() => unfriend(r.id).then(reload)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive">
                    Atšaukti
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <DmDialog friend={dmFriend} me={userId} onClose={() => setDmFriend(null)} />
    </div>
  );
}
