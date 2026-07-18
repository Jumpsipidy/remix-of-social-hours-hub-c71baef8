import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Send, Trash2, Clock } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!friend) {
      setRoomId(null);
      setMessages([]);
      return;
    }
    let unsub: (() => void) | null = null;
    (async () => {
      setLoading(true);
      try {
        const rid = await openDmRoom(friend.id);
        setRoomId(rid);
        const msgs = await listDmMessages(rid);
        setMessages(msgs);
        unsub = subscribeDmMessages(rid, (m) => {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        });
      } catch (e: any) {
        toast.error(e?.message ?? "Nepavyko atverti DM");
        onClose();
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friend?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!roomId || !text.trim()) return;
    try {
      await sendDmMessage(roomId, me, text);
      setText("");
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko išsiųsti");
    }
  };

  if (!friend) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur sm:items-center sm:p-4">
      <div className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:h-[70vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border bg-gradient-card px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{friend.name}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Trash2 className="h-3 w-3" /> Žinutės ištrinamos po 2 dienų · <Clock className="h-3 w-3" /> saugumo priežastimis
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-accent" aria-label="Uždaryti">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-background/40 p-4">
          {loading && <p className="text-center text-xs text-muted-foreground">Kraunama…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground">Dar nėra žinučių. Pasisveikink 👋</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine ? "bg-gradient-primary text-primary-foreground" : "bg-card border border-border"
                  }`}
                >
                  <p className="break-words whitespace-pre-wrap">{m.content}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-card p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Rašyk žinutę…"
            maxLength={2000}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={send}
            disabled={!text.trim() || !roomId}
            className="rounded-full bg-gradient-primary p-2 text-primary-foreground shadow-glow disabled:opacity-40"
            aria-label="Siųsti"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
