import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SUPPORT_SYSTEM_PROMPT } from "@/lib/support-knowledge";
import { SUPPORT_UI_GUIDE } from "@/lib/support-ui-guide";

// Spam limits (all server-side).
const MAX_LEN = 600;
const PER_THREAD_10MIN = 10;
const PER_IP_HOUR = 40;
const GLOBAL_AI_DAY = 2000;
const ESCALATIONS_PER_IP_DAY = 5;
// Paid OpenAI fallback caps — protect the wallet if Groq is down.
const OPENAI_GLOBAL_DAY = 300;
const OPENAI_PER_THREAD = 20;
const BUGS_PER_IP_DAY = 6;

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
type AiOut = { reply: string; options: string[]; escalate: boolean; askHuman: boolean; report: string; bug: Bug | null; form: "bug" | null };

function clean(v: unknown, n: number) { return String(v ?? "").trim().slice(0, n); }

// Builds one markdown message from the structured answer.
function compose(p: Record<string, unknown>) {
  const junk = (l: string) => /\[object Object\]/.test(l) || /^\s*"?(report|bug|escalate|ask_human|links|options|steps|form|reply)"?\s*:?\s*$/i.test(l) || /^\s*"?(report|bug|escalate|ask_human|links|options|steps|form)"?\s*:/i.test(l) || /^\s*[:,{}\[\]]+\s*$/.test(l);
  let out = clean(typeof p.reply === "string" ? p.reply : "", 1500).split("\n").filter((l) => !junk(l)).join("\n").trim() || "Atsiprašau, nesupratau. Gal gali paaiškinti kitaip?";
  const steps = Array.isArray(p.steps) ? p.steps.filter((x) => typeof x === "string" && !junk(x) && x.trim().length > 3).map((x) => clean(x, 200).replace(/^\s*(\d+[.)]|[-•])\s*/, "")).filter((x) => x && !/^\/[\w/-]*$/.test(x) && !/^\S+@\S+$/.test(x)).slice(0, 8) : [];
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
): Promise<AiOut | { status: number; detail?: string }> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ ...body, messages, response_format: { type: "json_object" } }),
    });
  } catch (e) {
    // Dropped connections ("socket hang up") fall through to the next provider instead of crashing.
    console.error("support ai network", url, (e as Error).message);
    return { status: 0, detail: (e as Error).message.slice(0, 160) };
  }
  if (!resp.ok) {
    const t = (await resp.text()).slice(0, 300);
    console.error("support ai", url, resp.status, t);
    let detail = t; try { detail = JSON.parse(t)?.error?.message ?? t; } catch { /* raw */ }
    return { status: resp.status, detail: String(detail).slice(0, 200) };
  }
  const json = await resp.json().catch(() => ({}));
  const content: string = json.choices?.[0]?.message?.content ?? "{}";
  let p: Record<string, unknown> = {};
  try { p = JSON.parse(content); } catch { const m = content.match(/\{[\s\S]*\}/); if (m) try { p = JSON.parse(m[0]); } catch { /* ignore */ } }
  const bug = p.bug && typeof p.bug === "object" ? (p.bug as Bug) : null;
  return {
    reply: compose(p),
    options: Array.isArray(p.options) ? p.options.filter((o) => typeof o === "string").map((o) => clean(o, 60)).filter(Boolean).slice(0, 4) : [],
    escalate: Boolean(p.escalate) || Boolean(bug),
    askHuman: Boolean(p.ask_human),
    report: clean(p.report, 800),
    bug,
    form: p.form === "bug" ? "bug" : null,
  };
}

// Lighter prompt (no detailed UI guide) for simple questions and Groq rate-limit retries.
const LITE_PROMPT = SUPPORT_SYSTEM_PROMPT.replace(SUPPORT_UI_GUIDE, "");

// Greetings/thanks get an instant reply with no model call at all.
const SMALL_TALK = /^\s*(labas|labukas|sveik[iasu]*|hello|hi|hey|ačiū|aciu|dėkui|dekui|thanks|ok|gerai|aha|super|šaunu|saunu)[\s!.?😊🙂]*$/i;
const SIMPLE = /(prisijung|registr|login|slaptažod|slaptazod|qr|tem[ąa]|kas tai|kaip veikia)/i;

// Tiered, cost-aware routing: free Groq models first; paid OpenAI only when both Groq tiers fail.
async function askAi(messages: { role: string; content: string }[], allowOpenai: boolean, simple: boolean, why: string[] = []) {
  const groq = process.env.GROQ_API_KEY?.trim();
  const lite = [{ role: "system", content: LITE_PROMPT + messages[0].content.slice(SUPPORT_SYSTEM_PROMPT.length) }, ...messages.slice(1).slice(-6)];
  const url = "https://api.groq.com/openai/v1/chat/completions";
  if (!groq) { console.error("support ai: GROQ_API_KEY missing"); why.push("G-nera"); }
  if (groq) {
    const r = await callModel(url, groq, { model: "openai/gpt-oss-20b", reasoning_effort: "low", max_completion_tokens: simple ? 900 : 1500 }, simple ? lite : messages);
    if ("reply" in r) return { ...r, provider: "groq" };
    why.push(`G1-${r.status}`);
  }
  if (groq) {
    const r = await callModel(url, groq, { model: "llama-3.1-8b-instant", max_completion_tokens: 700 }, lite);
    if ("reply" in r) return { ...r, provider: "groq" };
    why.push(`G2-${r.status}`);
  }
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (!openai) { console.error("support ai: OPENAI_API_KEY missing"); why.push("O-nera"); }
  else if (!allowOpenai) why.push("O-limitas");
  if (openai && allowOpenai) {
    const r = await callModel("https://api.openai.com/v1/chat/completions", openai,
      { model: "gpt-5-nano", reasoning_effort: "minimal", max_completion_tokens: 1200 }, simple ? lite : messages);
    if ("reply" in r) return { ...r, provider: "openai" };
    why.push(`O-${r.status}`);
  }
  return null;
}

async function saveBug(threadId: string, b: Bug, page?: string) {
  const db = await admin();
  const sev = ["low", "normal", "high", "critical"].includes(String(b.severity)) ? String(b.severity) : "normal";
  const text = [
    `[SV Pagalba] ${clean(b.title, 200) || "Pranešimas apie klaidą"}`,
    b.what_did && `Ką darė:\n${clean(b.what_did, 800)}`,
    b.what_saw && `Ką matė:\n${clean(b.what_saw, 800)}`,
    b.expected && `Tikėjosi:\n${clean(b.expected, 600)}`,
    b.device && `Įrenginys: ${clean(b.device, 200)}`,
  ].filter(Boolean).join("\n\n");
  await db.from("bug_reports").insert({
    message: text, severity: sev, page_url: clean(b.page, 200) || page || null,
    session_id: threadId, diagnostics: { source: "sv-pagalba", support_thread: threadId },
  });
}

const SendInput = z.object({
  token: z.string().min(20).max(100),
  message: z.string().trim().min(1).max(MAX_LEN),
  page: z.string().max(200).optional(),
  website: z.string().max(0).optional(), // honeypot: must stay empty
  accessToken: z.string().max(4000).optional(),
});

async function resolveUser(accessToken?: string) {
  if (!accessToken) return null;
  const db = await admin();
  const { data } = await db.auth.getUser(accessToken);
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

const LOGIN_HINT = "Kad galėtum kalbėtis su administratoriumi gyvai, pirmiausia prisijunk: viršuje dešinėje spausk **„Prisijungti“**, tada vėl atidaryk šį pokalbį ir parašyk „Perduok administratoriui“.";

async function findThread(token: string) {
  const db = await admin();
  const { data } = await db.from("support_threads").select("*").eq("token_hash", await sha(token)).maybeSingle();
  return data;
}

async function loadMessages(threadId: string) {
  const db = await admin();
  const { data } = await db.from("support_messages").select("id, role, content, created_at, provider")
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

    const user = await resolveUser(data.accessToken);
    let thread = await findThread(data.token);
    if (!thread) {
      const { data: created, error } = await db.from("support_threads")
        .insert({ token_hash: tokenHash, ip_hash: ipHash, page: data.page ?? null, user_id: user?.id ?? null }).select("*").single();
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
    await db.from("support_threads").update({ updated_at: new Date().toISOString(), page: data.page ?? thread.page, ...(user && !thread.user_id ? { user_id: user.id } : {}) }).eq("id", thread.id);

    // Already with a moderator: no AI, admin answers.
    if (thread.status === "escalated") {
      return { status: "escalated" as const, messages: await loadMessages(thread.id), options: [] };
    }

    const { count: globalCount } = await db.from("support_messages").select("id", { count: "exact", head: true })
      .eq("role", "assistant").gte("created_at", new Date(now - 86400_000).toISOString());
    if ((globalCount ?? 0) >= GLOBAL_AI_DAY) return { error: "Pagalbininkas šiandien užimtas. Rašyk pagalba@socialinesvalandos.dev." };

    const convo = [...history, { role: "user", content: data.message }].slice(-16)
      .map((m) => ({ role: m.role === "admin" ? "assistant" : m.role, content: m.content }));
    const { count: oaDay } = await db.from("support_messages").select("id", { count: "exact", head: true })
      .eq("provider", "openai").gte("created_at", new Date(now - 86400_000).toISOString());
    const oaThread = history.filter((m) => (m as { provider?: string }).provider === "openai").length;
    if (SMALL_TALK.test(data.message)) {
      const content = /ač|ac|dėk|dek|thank/i.test(data.message)
        ? "Visada prašom! 🙂 Jei dar kas nors neaišku — tiesiog parašyk."
        : "Labas! 👋 Esu SV Pagalba. Galiu padėti prisijungti, rasti veiklą, susitvarkyti QR kodą ar valandas. Ko reikia?";
      await db.from("support_messages").insert({ thread_id: thread.id, role: "assistant", content, provider: "local" });
      return { status: "ai" as const, messages: await loadMessages(thread.id), options: ["Kaip prisijungti?", "Kaip rasti veiklą?", "Kur mano QR kodas?"], askHuman: false, form: null, signedIn: Boolean(user) };
    }
    const why: string[] = [];
    const simple = data.message.length < 120 && history.length < 4 && SIMPLE.test(data.message);
    const ai = await askAi([
      { role: "system", content: `${SUPPORT_SYSTEM_PROMPT}\nŽmogus dabar puslapyje: ${data.page ?? "?"}. ${user ? "Žmogus prisijungęs." : "Žmogus NEprisijungęs — perduoti administratoriui gali tik prisijungę."}` },
      ...convo,
    ], (oaDay ?? 0) < OPENAI_GLOBAL_DAY && oaThread < OPENAI_PER_THREAD, simple, why);
    if (!ai) console.error("support ai all failed", why.join(" "));
    if (!ai) return { error: `Pagalbininkas laikinai nepasiekiamas. Rašyk pagalba@socialinesvalandos.dev. (kodas: ${why.join(" ") || "?"})` };

    // Reliable bug detection: open the report form even if the model forgets.
    if (/(neveikia|klaid|suged|nepavyk|nesiseka|neatsidaro|lūžt|luzt|strig|baltas ekranas|bug|error)/i.test(data.message)) { ai.form = "bug"; ai.bug = null; ai.escalate = false; ai.reply = ai.reply.split("\n\n")[0] ?? ai.reply; }
    if (ai.form === "bug") ai.reply += "\n\nAtidariau trumpą pranešimo formą — atsakyk į kelis klausimus, ir perduosiu viską administratoriui. 🐞";
    let escalate = ai.escalate;
    let loginNeeded = false;
    if (escalate && !user) { escalate = false; loginNeeded = true; }
    if (escalate) {
      const { count: escCount } = await db.from("support_threads").select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash).eq("status", "escalated").gte("updated_at", new Date(now - 86400_000).toISOString());
      if ((escCount ?? 0) >= ESCALATIONS_PER_IP_DAY) escalate = false;
    }
    const reply = escalate ? `${ai.reply}\n\nPerdaviau pokalbį administratoriui — jis gali prisijungti čia pat. Neuždaryk lango arba sugrįžk vėliau.`
      : loginNeeded ? `${ai.reply}\n\n${LOGIN_HINT}` : ai.reply;
    await db.from("support_messages").insert({ thread_id: thread.id, role: "assistant", content: reply, provider: ai.provider });
    if (ai.bug && !escalate) await saveBug(thread.id, ai.bug, data.page);
    if (escalate) {
      await db.from("support_threads").update({ status: "escalated", summary: ai.report || data.message, updated_at: new Date().toISOString() }).eq("id", thread.id);
      if (ai.bug) await saveBug(thread.id, ai.bug, data.page);
      const hook = process.env.DISCORD_WEBHOOK_URL;
      if (hook) {
        await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: `🆘 Nauja pagalbos užklausa: ${(ai.report || data.message).slice(0, 400)}` }) }).catch(() => {});
      }
    }
    return { status: (escalate ? "escalated" : "ai") as "ai" | "escalated", messages: await loadMessages(thread.id), options: escalate ? [] : ai.options, askHuman: ai.askHuman, form: ai.form, signedIn: Boolean(user) };
  });

const BugInput = z.object({
  token: z.string().min(20).max(100),
  accessToken: z.string().max(4000).optional(),
  page: z.string().max(200).optional(),
  where: z.string().trim().max(200).optional(),
  tried: z.string().trim().min(3).max(800),
  saw: z.string().trim().min(3).max(800),
  expected: z.string().trim().max(600).optional(),
  frequency: z.string().max(60).optional(),
  severity: z.enum(["low", "normal", "high", "critical"]),
  device: z.string().max(200).optional(),
  website: z.string().max(0).optional(),
});

// Bug report submitted from the animated in-chat form.
export const submitSupportBug = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => BugInput.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const ipHash = await sha(`sv-support:${clientIp()}`);
    const { count } = await db.from("support_messages").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).eq("provider", "bug").gte("created_at", new Date(Date.now() - 86400_000).toISOString());
    if ((count ?? 0) >= BUGS_PER_IP_DAY) return { error: "Šiandien jau išsiuntei daug pranešimų. Ačiū! Pabandyk rytoj." };
    const user = await resolveUser(data.accessToken);
    let thread = await findThread(data.token);
    if (!thread) {
      const { data: created } = await db.from("support_threads")
        .insert({ token_hash: await sha(data.token), ip_hash: ipHash, page: data.page ?? null, user_id: user?.id ?? null }).select("*").single();
      thread = created;
    }
    if (!thread) return { error: "Nepavyko išsiųsti. Bandyk dar kartą." };
    const where = data.where || data.page || "";
    await saveBug(thread.id, {
      title: data.saw.slice(0, 90), page: where, what_did: data.tried, what_saw: data.saw,
      expected: data.expected, device: [data.device, data.frequency && `Kartojasi: ${data.frequency}`].filter(Boolean).join(" · "),
      severity: data.severity,
    }, data.page);
    const summary = `🐞 Klaidos pranešimas\n- Kur: ${where || "?"}\n- Bandžiau: ${data.tried}\n- Mačiau: ${data.saw}${data.expected ? `\n- Tikėjausi: ${data.expected}` : ""}`;
    await db.from("support_messages").insert({ thread_id: thread.id, role: "user", content: summary, ip_hash: ipHash, provider: "bug" });
    const thanks = user
      ? "Ačiū — pranešimas jau administratoriaus lentoje **„Klaidų pranešimai“**. Perdaviau ir šį pokalbį, todėl administratorius gali prisijungti ir paklausti daugiau čia pat."
      : `Ačiū — pranešimas jau administratoriaus lentoje. ${LOGIN_HINT}`;
    await db.from("support_messages").insert({ thread_id: thread.id, role: "assistant", content: thanks, provider: "system" });
    if (user) {
      await db.from("support_threads").update({ status: "escalated", summary: `Klaida: ${data.saw.slice(0, 300)}`, updated_at: new Date().toISOString() }).eq("id", thread.id);
      const hook = process.env.DISCORD_WEBHOOK_URL;
      if (hook) await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: `🐞 Klaida per SV Pagalbą: ${data.saw.slice(0, 300)}` }) }).catch(() => {});
    }
    return { status: (user ? "escalated" : "ai") as "ai" | "escalated", messages: await loadMessages(thread.id) };
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
    const { data } = await db.from("support_threads").select("id, status, summary, page, created_at, updated_at, user_id")
      .order("updated_at", { ascending: false }).limit(100);
    const ids = [...new Set((data ?? []).map((t) => t.user_id).filter(Boolean))] as string[];
    const { data: profs } = ids.length ? await db.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
    const byId = new Map((profs ?? []).map((p) => [p.id, p]));
    return (data ?? []).map((t) => ({ ...t, who: t.user_id ? (byId.get(t.user_id)?.full_name || byId.get(t.user_id)?.email || "Prisijungęs") : null }));
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
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), message: z.string().trim().max(2000).optional(), status: z.enum(["ai", "escalated", "closed"]).optional(), join: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as never);
    const db = await admin();
    if (data.join) await db.from("support_messages").insert({ thread_id: data.id, role: "admin", content: "👋 Administratorius prisijungė prie pokalbio. Kuo galiu padėti?" });
    if (data.message) await db.from("support_messages").insert({ thread_id: data.id, role: "admin", content: data.message });
    if (data.join) data.status = "escalated";
    await db.from("support_threads").update({ updated_at: new Date().toISOString(), ...(data.status ? { status: data.status } : {}) }).eq("id", data.id);
    return loadMessages(data.id);
  });

// Super Admin: tiny live test of each AI provider, shows the real error.
export const adminTestSupportAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as never);
    const msgs = [{ role: "system", content: 'Atsakyk JSON: {"reply":"ok"}' }, { role: "user", content: "testas" }];
    const out: { name: string; keySet: boolean; ok: boolean; status?: number; detail?: string; ms: number }[] = [];
    const run = async (name: string, key: string | undefined, url: string, body: Record<string, unknown>) => {
      const k = key?.trim(); const t = Date.now();
      if (!k) { out.push({ name, keySet: false, ok: false, detail: "Raktas nerastas šioje aplinkoje", ms: 0 }); return; }
      const r = await callModel(url, k, body, msgs);
      out.push({ name, keySet: true, ok: "reply" in r, status: "reply" in r ? 200 : r.status, detail: "reply" in r ? "Veikia" : r.detail, ms: Date.now() - t });
    };
    const g = "https://api.groq.com/openai/v1/chat/completions";
    await run("Groq gpt-oss-20b", process.env.GROQ_API_KEY, g, { model: "openai/gpt-oss-20b", reasoning_effort: "low", max_completion_tokens: 200 });
    await run("Groq llama-3.1-8b", process.env.GROQ_API_KEY, g, { model: "llama-3.1-8b-instant", max_completion_tokens: 100 });
    await run("OpenAI gpt-5-nano", process.env.OPENAI_API_KEY, "https://api.openai.com/v1/chat/completions", { model: "gpt-5-nano", reasoning_effort: "minimal", max_completion_tokens: 200 });
    return { results: out, host: process.env.VERCEL ? "Vercel" : "Lovable", at: new Date().toISOString() };
  });
