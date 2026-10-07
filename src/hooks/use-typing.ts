import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * "…" rašymo indikatorius per Supabase Realtime broadcast (be DB įrašų).
 * Grąžina ar kitas žmogus šiuo metu rašo ir funkciją, kurią kviesti rašant.
 */
export function useTypingIndicator(roomKey: string | null, me: string | null | undefined) {
  const [othersTyping, setOthersTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setOthersTyping(false);
    if (!roomKey || !me) return;
    const ch = supabase.channel(`typing:${roomKey}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if ((payload as { user?: string })?.user === me) return;
      setOthersTyping(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setOthersTyping(false), 3500);
    });
    ch.on("broadcast", { event: "stop" }, () => setOthersTyping(false));
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      clearTimeout(hideTimer.current);
      channelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [roomKey, me]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (!channelRef.current || now - lastSent.current < 1500) return;
    lastSent.current = now;
    void channelRef.current.send({ type: "broadcast", event: "typing", payload: { user: me } });
  }, [me]);

  const notifyStop = useCallback(() => {
    lastSent.current = 0;
    void channelRef.current?.send({ type: "broadcast", event: "stop", payload: { user: me } });
  }, [me]);

  return { othersTyping, notifyTyping, notifyStop };
}
