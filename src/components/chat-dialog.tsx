import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type ChatReservation = {
  id: string;
  student_id: string;
  organization_id: string;
  organization_name?: string;
  /** School-admin ↔ organization channel without a reservation row. */
  direct?: boolean;
};

/**
 * The old pop-up chat was removed. This finds/creates the room and opens it
 * on the /chat page instead (one chat system everywhere).
 */
export function ChatDialog({ reservation, onClose }: { reservation: ChatReservation | null; onClose: () => void }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!reservation || !user) return;
    let cancelled = false;
    (async () => {
      // Look up / create room
      let r: { id: string; student_id: string | null; organization_id: string; school_admin_id: string | null } | null = null;

      if (reservation.direct) {
        // school admin ↔ organization direct chat (reservation_id NULL)
        const { data: existing } = await supabase
          .from("chat_rooms")
          .select("id, student_id, organization_id, school_admin_id")
          .is("reservation_id", null)
          .eq("school_admin_id", user.id)
          .eq("organization_id", reservation.organization_id)
          .maybeSingle();
        r = existing ?? null;
        if (!r) {
          const { data: created, error } = await supabase
            .from("chat_rooms")
            .insert({
              reservation_id: null,
              student_id: user.id, // constraint requires NOT NULL; reuse admin's own id
              organization_id: reservation.organization_id,
              school_admin_id: user.id,
            })
            .select("id, student_id, organization_id, school_admin_id")
            .maybeSingle();
          if (error) { toast.error("Nepavyko atverti pokalbio: " + error.message); onClose(); return; }
          r = created;
        }
      } else {
        const { data: existing } = await supabase
          .from("chat_rooms")
          .select("id, student_id, organization_id, school_admin_id")
          .eq("reservation_id", reservation.id)
          .maybeSingle();
        r = existing ?? null;
        if (!r) {
          const { data: created, error } = await supabase
            .from("chat_rooms")
            .insert({
              reservation_id: reservation.id,
              student_id: reservation.student_id,
              organization_id: reservation.organization_id,
              school_admin_id: profile?.role === "school_admin" ? user.id : null,
            })
            .select("id, student_id, organization_id, school_admin_id")
            .maybeSingle();
          if (error) { toast.error("Nepavyko atverti pokalbio: " + error.message); onClose(); return; }
          r = created;
        } else if (profile?.role === "school_admin" && !r.school_admin_id) {
          const { data: upd } = await supabase
            .from("chat_rooms")
            .update({ school_admin_id: user.id })
            .eq("id", r.id)
            .select("id, student_id, organization_id, school_admin_id")
            .maybeSingle();
          if (upd) r = upd;
        }

      }

      if (cancelled || !r) { onClose(); return; }
      onClose();
      navigate({ to: "/chat", search: { room: r.id } });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation?.id, reservation?.organization_id, user?.id]);

  if (!reservation) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-background/60 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin" /> Atidaromas pokalbis…
      </div>
    </div>
  );
}
