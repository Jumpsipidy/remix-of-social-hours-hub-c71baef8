import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTypingIndicator } from "@/hooks/use-typing";
import { TypingDots, LinkifiedText } from "@/components/typing-dots";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageComposer } from "@/components/message-composer";
import { MessageThreadSkeleton } from "@/components/skeleton-loader";
import { openDmRoom, listDmMessages, sendDmMessage, subscribeDmMessages, type DmMessage } from "@/lib/dm";

export function DmDialog({
  friend,
  me,
  onClose,
}: {
  friend: { id: string; name: string } | null;
  me: string;
  onClose: () => void;
}) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const sendLock = useRef(false);
  const followLatest = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { othersTyping, notifyTyping, notifyStop } = useTypingIndicator(roomId ? `dm-${roomId}` : null, me);

  useEffect(() => {
    if (!friend) {
      setRoomId(null);
      setMessages([]);
      return;
    }
    let alive = true;
    let unsub: (() => void) | null = null;
    setRoomId(null);
    setMessages([]);
    setText("");
    followLatest.current = true;
    (async () => {
      setLoading(true);
      try {
        const rid = await openDmRoom(friend.id);
        if (!alive) return;
        setRoomId(rid);
        const msgs = await listDmMessages(rid);
        if (!alive) return;
        setMessages(msgs);
        unsub = subscribeDmMessages(rid, (m) => {
          if (!alive) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        });
      } catch (e: any) {
        if (!alive) return;
        toast.error(e?.message ?? "Nepavyko atverti DM");
        onClose();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friend?.id]);

  useEffect(() => {
    if (followLatest.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
  }, [messages.length]);

  const send = async () => {
    if (!roomId || !text.trim() || sendLock.current) return;
    const content = text;
    sendLock.current = true;
    setSending(true);
    try {
      await sendDmMessage(roomId, me, content);
      setText((current) => current === content ? "" : current);
      followLatest.current = true;
      notifyStop();
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko išsiųsti");
    } finally { sendLock.current = false; setSending(false); }
  };

  if (!friend) return null;

  return (
    <Dialog open={!!friend} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="dm-chat-dialog flex h-[calc(var(--visual-viewport-height,100dvh)-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:h-[70vh]">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-14">
          <DialogTitle className="truncate text-sm">{friend.name}</DialogTitle>
          <DialogDescription className="text-xs">Asmeninis pokalbis · žinutės ištrinamos po 2 dienų</DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} role="log" aria-label="Asmeninės žinutės" aria-live="polite" aria-relevant="additions" aria-busy={loading} onScroll={() => { const node = scrollRef.current; if (node) followLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100; }} className="chat-transcript min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-background/40 p-3 sm:p-4">
          {loading && <MessageThreadSkeleton />}
          {!loading && messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">Dar nėra žinučių. Pasisveikink 👋</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`min-w-0 max-w-[88%] rounded-lg sm:max-w-[75%] px-3 py-2 text-sm shadow-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                  }`}
                >
                  <LinkifiedText text={m.content} className="message-text whitespace-pre-wrap [overflow-wrap:anywhere]" />
                  <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <TypingDots show={othersTyping} name={friend.name} />
        </div>

        <MessageComposer value={text} onChange={(value) => { setText(value); notifyTyping(); }} onSend={() => { void send(); }} sending={sending} disabled={loading || !roomId} />
      </DialogContent>
    </Dialog>
  );
}
