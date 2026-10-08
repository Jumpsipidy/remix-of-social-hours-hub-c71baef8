import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DmDialog } from "@/components/dm-dialog";
import { Button } from "@/components/ui/button";

type Row = { room: string; other: string; name: string; last: string; at: string };

/** Asmeninės žinutės (pvz. auklėtojos rekomendacijos) mokinio skydelyje. */
export function DmInbox({ me, showTeachers = false }: { me: string; showTeachers?: boolean }) {
  const [teachers, setTeachers] = useState<{ id: string; full_name: string | null }[]>([]);
  useEffect(() => {
    if (!showTeachers) return;
    (supabase.rpc as any)("list_my_teachers").then(({ data }: { data: unknown }) => setTeachers((data as never[]) ?? []));
  }, [showTeachers]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: rooms } = await supabase.from("dm_rooms").select("id, user_a, user_b").or(`user_a.eq.${me},user_b.eq.${me}`).limit(30);
      const list = (rooms ?? []) as { id: string; user_a: string; user_b: string }[];
      if (!list.length) { if (alive) setRows([]); return; }
      const others = list.map((r) => (r.user_a === me ? r.user_b : r.user_a));
      const [{ data: profs }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, role").in("id", others),
        supabase.from("dm_messages").select("room_id, content, created_at").in("room_id", list.map((r) => r.id)).order("created_at", { ascending: false }).limit(200),
      ]);
      const nameOf = Object.fromEntries(((profs ?? []) as { id: string; full_name: string | null; role: string }[]).map((p) => [p.id, `${p.full_name ?? "Naudotojas"}${p.role === "school_admin" ? " · auklėtoja" : ""}`]));
      const out: Row[] = [];
      for (const r of list) {
        const m = ((msgs ?? []) as { room_id: string; content: string; created_at: string }[]).find((x) => x.room_id === r.id);
        if (!m) continue;
        const other = r.user_a === me ? r.user_b : r.user_a;
        out.push({ room: r.id, other, name: nameOf[other] ?? "Naudotojas", last: m.content, at: m.created_at });
      }
      out.sort((a, b) => b.at.localeCompare(a.at));
      if (alive) setRows(out);
    })();
    return () => { alive = false; };
  }, [me, open, refresh]);

  useEffect(() => {
    const refreshRows = () => setRefresh((n) => n + 1);
    const channel = supabase.channel(`dm-inbox-${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, refreshRows)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_rooms" }, refreshRows)
      .subscribe();
    const resume = () => { if (!document.hidden) refreshRows(); };
    document.addEventListener("visibilitychange", resume);
    return () => { void supabase.removeChannel(channel); document.removeEventListener("visibilitychange", resume); };
  }, [me]);

  if (!rows || (rows.length === 0 && teachers.length === 0)) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-card-foreground sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 font-bold"><MessageCircle className="h-4 w-4 text-primary" /> Asmeninės žinutės</h3>
      {teachers.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {teachers.map((t) => (
            <Button key={t.id} onClick={() => setOpen({ id: t.id, name: `${t.full_name ?? "Auklėtoja"} · auklėtoja` })}
              className="h-auto min-h-11 max-w-full whitespace-normal px-3 py-2 text-left text-xs font-bold">
              <MessageCircle className="h-3.5 w-3.5" /> Rašyti: {t.full_name ?? "auklėtojai"}
            </Button>
          ))}
        </div>
      )}
      {rows.length === 0 && <p className="text-xs text-muted-foreground">Žinučių dar nėra.</p>}
      <ul className="divide-y divide-border">
        {rows.slice(0, 8).map((r) => (
          <li key={r.room}>
            <Button variant="ghost" onClick={() => setOpen({ id: r.other, name: r.name })} className="h-auto min-h-14 w-full justify-start whitespace-normal rounded-none gap-3 px-0 py-2.5 text-left">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.last.replace(/https?:\/\/\S+/g, "🔗")}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">{new Date(r.at).toLocaleDateString("lt-LT")}</span>
            </Button>
          </li>
        ))}
      </ul>
      <DmDialog friend={open} me={me} onClose={() => setOpen(null)} />
    </div>
  );
}
