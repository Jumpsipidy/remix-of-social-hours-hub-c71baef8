import { Check, Clock3, Crown, Users } from "lucide-react";
import type { GroupMemberRow } from "@/lib/friends";

/** Kompaktiška grupės juosta rezervacijos kortelėje: kas eina, kas dar galvoja. */
export function ReservationGroupStrip({ members, meId }: { members: GroupMemberRow[]; meId: string }) {
  const going = members.filter((m) => m.status !== "pending").length;
  const waiting = members.length - going;
  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
        <Users className="h-3.5 w-3.5" /> Eina kartu: {going}{waiting ? ` · laukia atsakymo: ${waiting}` : ""}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {members.map((m) => {
          const pending = m.status === "pending";
          const name = m.member_id === meId ? "Tu" : (m.full_name?.trim() || "Draugas");
          return (
            <li
              key={m.member_id}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${pending ? "border-dashed border-border text-muted-foreground" : "border-primary/30 bg-primary/5 text-foreground"}`}
              title={m.is_owner ? "Sukūrė rezervaciją" : pending ? "Dar neatsakė" : m.checked_in ? "Atvyko" : "Eina"}
            >
              {m.is_owner ? <Crown className="h-3 w-3 text-primary" /> : pending ? <Clock3 className="h-3 w-3" /> : <Check className="h-3 w-3 text-success" />}
              {name}{m.class_year ? <span className="text-muted-foreground"> · {m.class_year}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
