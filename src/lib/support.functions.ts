import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SUPPORT_SYSTEM_PROMPT } from "@/lib/support-knowledge";

// Spam limits (all server-side).
const MAX_LEN = 600;
const PER_THREAD_10MIN = 10;
const PER_IP_HOUR = 40;
const GLOBAL_AI_DAY = 2000;
const ESCALATIONS_PER_IP_DAY = 5;

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp() {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-real-ip") ||
    (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    "unknown"
  );
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type AiOut = { reply: string; options: string[]; escalate: boolean; report: string };

async function callModel(
  url: string, key: string, model: string,
  messages: { role: string; content: string }[],
): Promise<AiOut | { status: number }> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0.3, max_tokens: 450, messages, response_format: { type: "json_object" } }),
  });
  if (!resp.ok) return { status: resp.status };
  const json = await resp.json();
  const content: string = json.choices?.[0]?.message?.content ?? "{}";
  let p: Partial<AiOut> = {};
  try { p = JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); if (m) try { p = JSON.parse(m[0]); } catch { /* ignore */ } }
  return {
    reply: String(p.reply ?? "").slice(0, 1500) || "Atsiprašau, nesupratau. Gal gali paaiškinti kitaip?",
    options: Array.isArray(p.options) ? p.options.map(String).filter(Boolean).slice(0, 4).map((o) => o.slice(0, 60)) : [],
    escalate: Boolean(p.escalate),
    report: String(p.report ?? "").slice(0, 800),
  };
}

// Free Groq first, paid OpenAI if Groq is missing, out of quota or down.
async function askAi(messages: { role: string; content: string }[]) {
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    const r = await callModel("https://api.groq.com/openai/v1/chat/completions", groq, "llama-3.1-8b-instant", messages);
    if ("reply" in r) return { ...r, provider: "groq" };
  }
  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    const r = await callModel("https://api.openai.com/v1/chat/completions", openai, "gpt-4o-mini", messages);
    if ("reply" in r) return { ...r, provider: "openai" };
  }
  return null;
}

const SendInput = z.object({
  token: z.string().min(20).max(100),
  message: z.string().trim().min(1).max(MAX_LEN),
  page: z.string().max(200).optional(),
  website: z.string().max(0).optional(), // honeypot: must stay empty
});

async function findThread(token: string) {
  const db = await admin();
  const { data } = await db.from("support_threads").select("*").eq("token_hash", await sha(token)).maybeSingle();
  return data;
}

async function loadMessages(threadId: string) {
  const db = await admin();
  const { data } = await db.from("support_messages").select("id, role, content, created_at")
    .eq("thread_id", threadId).order("created_at", { ascending: true }).limit(60);
  return data ?? [];
}

export const getSupportThread = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(20).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const t = await findThread(data.token);
    if (!t) return { status: "ai" as const, messages: [] };
    return { status: t.status as "ai" | "escalated" | "closed", messages: await loadMessages(t.id) };
  });

export const sendSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SendInput.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const ipHash = await sha(`sv-support:${clientIp()}`);
    const tokenHash = await sha(data.token);
    const now = Date.now();

    const { count: ipCount } = await db.from("support_messages").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).eq("role", "user").gte("created_at", new Date(now - 3600_000).toISOString());
    if ((ipCount ?? 0) >= PER_IP_HOUR) return { error: "Per daug žinučių. Pabandyk po valandos arba rašyk pagalba@socialinesvalandos.dev." };

    let thread = await findThread(data.token);
    if (!thread) {
      const { data: created, error } = await db.from("support_threads")
        .insert({ token_hash: tokenHash, ip_hash: ipHash, page: data.page ?? null }).select("*").single();
      if (error || !created) return { error: "Nepavyko pradėti pokalbio. Bandyk dar kartą." };
      thread = created;
    }
    if (thread.status === "closed") {
      await db.from("support_threads").update({ status: "ai", updated_at: new Date().toISOString() }).eq("id", thread.id);
      thread.status = "ai";
    }

    const history = await loadMessages(thread.id);
    const recent = history.filter((m) => m.role === "user" && now - new Date(m.created_at).getTime() < 600_000);
    if (recent.length >= PER_THREAD_10MIN) return { error: "Palauk kelias minutes prieš rašydamas vėl." };
    const last = recent.at(-1);
    if (last && now - new Date(last.created_at).getTime() < 2000) return { error: "Per greitai. Palauk akimirką." };
    if (last && last.content === data.message) return { error: "Tą pačią žinutę jau išsiuntei." };

    await db.from("support_messages").insert({ thread_id: thread.id, role: "user", content: data.message, ip_hash: ipHash });
    await db.from("support_threads").update({ updated_at: new Date().toISOString(), page: data.page ?? thread.page }).eq("id", thread.id);

    // Already with a moderator: no AI, admin answers.
    if (thread.status === "escalated") {
      return { status: "escalated" as const, messages: await loadMessages(thread.id), options: [] };
    }

    const { count: globalCount } = await db.from("support_messages").select("id", { count: "exact", head: true })
      .eq("role", "assistant").gte("created_at", new Date(now - 86400_000).toISOString());
    if ((globalCount ?? 0) >= GLOBAL_AI_DAY) return { error: "Pagalbininkas šiandien užimtas. Rašyk pagalba@socialinesvalandos.dev." };

    const convo = [...history, { role: "user", content: data.message }].slice(-16)
      .map((m) => ({ role: m.role === "admin" ? "assistant" : m.role, content: m.content }));
    const ai = await askAi([
      { role: "system", content: `${SUPPORT_SYSTEM_PROMPT}\nŽmogus dabar puslapyje: ${data.page ?? "?"}` },
      ...convo,
    ]);
    if (!ai) return { error: "Pagalbininkas laikinai nepasiekiamas. Rašyk pagalba@socialinesvalandos.dev." };

    let escalate = ai.escalate;
    if (escalate) {
      const { count: escCount } = await db.from("support_threads").select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash).eq("status", "escalated").gte("updated_at", new Date(now - 86400_000).toISOString());
      if ((escCount ?? 0) >= ESCALATIONS_PER_IP_DAY) escalate = false;
    }
    const reply = escalate ? `${ai.reply}\n\nPerdaviau tavo klausimą administratoriui — atsakymas atsiras čia.` : ai.reply;
    await db.from("support_messages").insert({ thread_id: thread.id, role: "assistant", content: reply, provider: ai.provider });
    if (escalate) {
      await db.from("support_threads").update({ status: "escalated", summary: ai.report || data.message, updated_at: new Date().toISOString() }).eq("id", thread.id);
      const hook = process.env.DISCORD_WEBHOOK_URL;
      if (hook) {
        await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: `🆘 Nauja pagalbos užklausa: ${(ai.report || data.message).slice(0, 400)}` }) }).catch(() => {});
      }
    }
    return { status: (escalate ? "escalated" : "ai") as "ai" | "escalated", messages: await loadMessages(thread.id), options: escalate ? [] : ai.options };
  });

// ---------- Super Admin ----------
async function requireAdmin(context: { supabase: { rpc: (...a: never[]) => unknown }; userId: string }) {
  const { data: isAdmin } = await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Reikia administratoriaus teisių");
}

export const adminListSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as never);
    const db = await admin();
    const { data } = await db.from("support_threads").select("id, status, summary, page, created_at, updated_at")
      .order("updated_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const adminGetSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    return loadMessages(data.id);
  });

export const adminReplySupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), message: z.string().trim().max(2000).optional(), status: z.enum(["ai", "escalated", "closed"]).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const db = await admin();
    if (data.message) await db.from("support_messages").insert({ thread_id: data.id, role: "admin", content: data.message });
    await db.from("support_threads").update({ updated_at: new Date().toISOString(), ...(data.status ? { status: data.status } : {}) }).eq("id", data.id);
    return loadMessages(data.id);
  });
