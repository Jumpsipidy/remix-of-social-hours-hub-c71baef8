import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type ChatReservation = {
  id: string;
  student_id: string;
  organization_id: string | null;
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
      if (reservation.direct && !reservation.organization_id) { onClose(); return; }
      const { data: roomId, error } = reservation.direct
        ? await supabase.rpc("open_chat_with", { _other: reservation.organization_id ?? "" })
        : await supabase.rpc("open_reservation_chat", { _reservation: reservation.id });
      if (cancelled) return;
      if (error || !roomId) { toast.error("Nepavyko atverti pokalbio. Bandyk dar kartą."); onClose(); return; }
      onClose();
      if (profile?.role === "school_admin") navigate({ to: "/mokytojas/pokalbiai", search: { room: roomId } });
      else navigate({ to: "/chat", search: { room: roomId } });
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
