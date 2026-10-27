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

type Bug = { title?: string; page?: string; what_did?: string; what_saw?: string; expected?: string; device?: string; severity?: string };
type AiOut = { reply: string; options: string[]; escalate: boolean; askHuman: boolean; report: string; bug: Bug | null };

function clean(v: unknown, n: number) { return String(v ?? "").trim().slice(0, n); }

// Builds one markdown message from the structured answer.
function compose(p: Record<string, unknown>) {
  let out = clean(p.reply, 1500).split("\n").filter((l) => !/^\s*"?(report|bug|escalate|ask_human)"?\s*:/i.test(l)).join("\n").trim() || "Atsiprašau, nesupratau. Gal gali paaiškinti kitaip?";
  const steps = Array.isArray(p.steps) ? p.steps.map((x) => clean(x, 200).replace(/^\s*(\d+[.)]|[-•])\s*/, "")).filter(Boolean).slice(0, 8) : [];
  if (steps.length) out += "\n\n" + steps.map((x, i) => `${i + 1}. ${x}`).join("\n");
  const links = Array.isArray(p.links) ? (p.links as { label?: unknown; href?: unknown }[])
    .map((l) => ({ label: clean(l?.label, 60), href: clean(l?.href, 120) }))
    .filter((l) => l.label && /^\/[a-z0-9/_-]*$/i.test(l.href)).slice(0, 3) : [];
  if (links.length) out += "\n\n" + links.map((l) => `→ [${l.label}](${l.href})`).join("\n");
  return out;
}

async function callModel(
  url: string, key: string, body: Record<string, unknown>,
  messages: { role: string; content: string }[],
): Promise<AiOut | { status: number }> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ ...body, messages, response_format: { type: "json_object" } }),
  });
  if (!resp.ok) { console.error("support ai", url, resp.status, (await resp.text()).slice(0, 200)); return { status: resp.status }; }
  const json = await resp.json();
  const content: string = json.choices?.[0]?.message?.content ?? "{}";
  let p: Record<string, unknown> = {};
  try { p = JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); if (m) try { p = JSON.parse(m[0]); } catch { /* ignore */ } }
  const bug = p.bug && typeof p.bug === "object" ? (p.bug as Bug) : null;
  return {
    reply: compose(p),
    options: Array.isArray(p.options) ? p.options.map((o) => clean(o, 60)).filter(Boolean).slice(0, 4) : [],
    escalate: Boolean(p.escalate) || Boolean(bug),
    askHuman: Boolean(p.ask_human),
    report: clean(p.report, 800),
    bug,
  };
}

// Cheap reasoning models: free Groq gpt-oss-20b first, paid OpenAI gpt-5-nano as fallback.
async function askAi(messages: { role: string; content: string }[]) {
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    const r = await callModel("https://api.groq.com/openai/v1/chat/completions", groq,
      { model: "openai/gpt-oss-20b", reasoning_effort: "low", max_completion_tokens: 1500 }, messages);
    if ("reply" in r) return { ...r, provider: "groq" };
  }
  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    const r = await callModel("https://api.openai.com/v1/chat/completions", openai,
      { model: "gpt-5-nano", reasoning_effort: "low", max_completion_tokens: 2500 }, messages);
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
      if (ai.bug) {
        const b = ai.bug;
        const sev = ["low", "normal", "high", "critical"].includes(String(b.severity)) ? String(b.severity) : "normal";
        const text = [
          `[SV Pagalba] ${clean(b.title, 200) || "Pranešimas apie klaidą"}`,
          b.what_did && `Ką darė:\n${clean(b.what_did, 800)}`,
          b.what_saw && `Ką matė:\n${clean(b.what_saw, 800)}`,
          b.expected && `Tikėjosi:\n${clean(b.expected, 600)}`,
          b.device && `Įrenginys: ${clean(b.device, 200)}`,
        ].filter(Boolean).join("\n\n");
        await db.from("bug_reports").insert({
          message: text, severity: sev, page_url: clean(b.page, 200) || data.page || null,
          session_id: thread.id, diagnostics: { source: "sv-pagalba", support_thread: thread.id },
        });
      }
      const hook = process.env.DISCORD_WEBHOOK_URL;
      if (hook) {
        await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: `🆘 Nauja pagalbos užklausa: ${(ai.report || data.message).slice(0, 400)}` }) }).catch(() => {});
      }
    }
    return { status: (escalate ? "escalated" : "ai") as "ai" | "escalated", messages: await loadMessages(thread.id), options: escalate ? [] : ai.options, askHuman: ai.askHuman };
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
