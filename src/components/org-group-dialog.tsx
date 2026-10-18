import { Check, Clock, ScanLine, UserCheck, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type OrgParticipant = {
  id: string;
  reservation_id: string;
  student_id: string;
  status: "pending" | "accepted" | "declined" | "removed";
  checked_in_at: string | null;
};

export type GroupMember = { id: string; name: string; role: "owner" | "member"; status: OrgParticipant["status"] | "owner"; checkedInAt: string | null };

const STATUS: Record<string, { label: string; cls: string; icon: typeof Check }> = {
  owner: { label: "Rezervavo", cls: "bg-primary/10 text-primary", icon: Users },
  accepted: { label: "Priėmė", cls: "bg-success/15 text-success", icon: Check },
  pending: { label: "Laukia atsakymo", cls: "bg-warning/15 text-warning-foreground", icon: Clock },
  declined: { label: "Atmetė", cls: "bg-muted text-muted-foreground", icon: X },
};

/** Lists everyone in a group reservation and whether each person has checked in. */
export function OrgGroupDialog({ open, onClose, title, members }: { open: boolean; onClose: () => void; title: string; members: GroupMember[] }) {
  const going = members.filter((m) => m.status === "owner" || m.status === "accepted");
  const checked = going.filter((m) => m.checkedInAt).length;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Grupė · {going.length} dalyviai</DialogTitle>
          <DialogDescription>{title} · įsiregistravo {checked}/{going.length}</DialogDescription>
        </DialogHeader>
        <ul className="mt-2 space-y-2">
          {members.map((m) => {
            const s = STATUS[m.status] ?? STATUS.pending;
            const Icon = s.icon;
            return (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-primary">{m.name.trim().charAt(0).toUpperCase() || "?"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.name}</p>
                  {(m.status === "owner" || m.status === "accepted") && (
                    m.checkedInAt
                      ? <p className="flex items-center gap-1 text-xs text-success"><UserCheck className="h-3 w-3" /> Įsiregistravo {new Date(m.checkedInAt).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}</p>
                      : <p className="flex items-center gap-1 text-xs text-muted-foreground"><ScanLine className="h-3 w-3" /> Dar neįsiregistravo</p>
                  )}
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}><Icon className="h-3 w-3" /> {s.label}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Kiekvienas dalyvis turi savo QR arba 6 skaitmenų kodą — nuskaityk juos skiltyje „Skenuoti“.</p>
      </DialogContent>
    </Dialog>
  );
}
