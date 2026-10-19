import { useEffect, useState } from "react";
import { Users, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMyFriendships, fetchFriendProfiles, type FriendProfile } from "@/lib/friends";

export function ReservationFriendsPicker({ userId, enabled, onEnabled, selected, onSelected }: { userId: string; enabled: boolean; onEnabled: (value: boolean) => void; selected: string[]; onSelected: (ids: string[]) => void }) {
  const [friends, setFriends] = useState<FriendProfile[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setFailed(false); setFriends(null);
    void listMyFriendships(userId).then(async (rows) => {
      const ids = rows.filter((row) => row.status === "accepted").map((row) => row.requester_id === userId ? row.addressee_id : row.requester_id);
      const profiles = await fetchFriendProfiles(ids);
      if (alive) setFriends(ids.map((id) => profiles[id]).filter(Boolean));
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [enabled, userId, attempt]);
  return <div className="mt-5 overflow-hidden rounded-lg border border-border bg-background">
    <Button type="button" variant="ghost" role="switch" aria-checked={enabled} onClick={() => onEnabled(!enabled)} className="h-auto min-h-16 w-full justify-start gap-3 whitespace-normal p-4 text-left">
      <Users className="shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block font-semibold">Eiti su draugais</span><span className="block text-xs font-normal text-muted-foreground">Kiekvienas priima kvietimą ir gauna savo kodą.</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full ${enabled ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-1 size-4 rounded-full bg-background transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} /></span>
    </Button>
    {enabled && <div className="border-t border-border p-4">
      {failed ? <Button type="button" variant="outline" onClick={() => setAttempt((value) => value + 1)}><RefreshCw />Draugų įkelti nepavyko. Kartoti</Button> : friends === null ? <p role="status" className="text-sm text-muted-foreground">Kraunami draugai…</p> : friends.length === 0 ? <p className="text-sm text-muted-foreground">Dar neturi patvirtintų draugų.</p> : <div className="flex flex-wrap gap-2">{friends.map((friend) => <Button type="button" key={friend.id} size="sm" variant={selected.includes(friend.id) ? "default" : "outline"} aria-pressed={selected.includes(friend.id)} onClick={() => onSelected(selected.includes(friend.id) ? selected.filter((id) => id !== friend.id) : [...selected, friend.id])}>{selected.includes(friend.id) && <Check />}{friend.full_name ?? "Draugas"}</Button>)}</div>}
    </div>}
  </div>;
}