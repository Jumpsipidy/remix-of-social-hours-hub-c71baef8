import { createServerFn } from "@tanstack/react-start";
import { upsertAnalysis } from "@/lib/ai-analysis-store.server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


const AnalyzeInput = z.object({
  fingerprint: z.string().min(1),
  force: z.boolean().optional(),
});

const SYSTEM_PROMPT = `Tu esi ekspertas debuggeris "Socialinės Valandos" projektui.
Tech stack: TanStack Start (React 19 + TypeScript), Tailwind v4, Supabase (PostgreSQL + RLS), Vercel Edge, framer-motion, @zxing/browser (QR), pdf-lib, sonner.
Failų struktūra: src/routes/*.tsx (file-based routes), src/lib/*.functions.ts (server fns), src/components/**, src/hooks/**.
Kalbėk lietuviškai. Būk konkretus, tiesus, jokių išsigalvojimų. Jei nesi tikras — sakyk "unknown" arba "hipotezė".

Analizuok pateiktą klaidos grupę ir grąžink TIKTAI validų JSON (be markdown, be code fence):
{
  "suspected_cause": "1-2 trumpi sakiniai — kas tiksliai kaltas (funkcija, race condition, null access, RLS, etc.)",
  "suggested_file": "src/... failo kelias (arba 'unknown')",
  "suggested_fix": "3-5 konkretūs numeruoti žingsniai — nurodyk funkcijas/eilutes iš stack, ką pakeisti į ką",
  "prompt_for_agent": "PILNAS super-promptas Lovable agentui (LT, 4-8 sakiniai). Struktūra: [1] Kontekstas: kas nutinka (klaida + kur + kada + kiek vartotojų). [2] Failas ir eilutė (iš stack). [3] Tikėtina priežastis. [4] Konkretus fix'as — kokį kodą pakeisti ir į ką. [5] Testavimo žingsniai — kaip patikrinti kad pataisyta. [6] Regresijos prevencija. Rašyk taip lyg duotum užduotį junior devui — jokių abstrakcijų.",
  "severity_estimate": "critical|high|medium|low",
  "confidence": 0.0-1.0
}`;

// ============ LIMITS (protection against runaway AI cost) ============
// Per-admin daily cap: 30 forced analyses per admin per 24h
// Global daily cap: 150 forced analyses across all admins per 24h
// Global monthly token cap: 2,000,000 tokens per calendar month (~$1-2 on Gemini Flash)
// Cached hits (non-forced re-reads) DO NOT count against limits.
const LIMIT_PER_ADMIN_PER_DAY = 30;
const LIMIT_GLOBAL_PER_DAY = 150;
const LIMIT_TOKENS_PER_MONTH = 2_000_000;

async function checkLimits(supabaseAdmin: SupabaseClient, userId: string) {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { count: mineToday } = await supabaseAdmin
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "ai.analysis.run")
    .gte("created_at", dayAgo);
  if ((mineToday ?? 0) >= LIMIT_PER_ADMIN_PER_DAY) {
    throw new Error(`Pasiekei savo dienos limitą (${LIMIT_PER_ADMIN_PER_DAY} AI analizių/24h). Bandyk rytoj.`);
  }

  const { count: globalToday } = await supabaseAdmin
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "ai.analysis.run")
    .gte("created_at", dayAgo);
  if ((globalToday ?? 0) >= LIMIT_GLOBAL_PER_DAY) {
    throw new Error(`Global dienos limitas pasiektas (${LIMIT_GLOBAL_PER_DAY}/24h). Palauk kelias valandas.`);
  }

  const { data: monthRows } = await supabaseAdmin
    .from("ai_error_analyses")
    .select("tokens_used")
    .gte("updated_at", monthStart);
  const tokensThisMonth = (monthRows ?? []).reduce(
    (s: number, r: { tokens_used: number | null }) => s + (Number(r.tokens_used) || 0),
    0,
  );
  if (tokensThisMonth >= LIMIT_TOKENS_PER_MONTH) {
    throw new Error(`Mėnesio AI token limitas pasiektas (${LIMIT_TOKENS_PER_MONTH.toLocaleString()}). Resetas 1 mėnesio dieną.`);
  }

  return { mineToday: mineToday ?? 0, globalToday: globalToday ?? 0, tokensThisMonth };
}


export const analyzeErrorGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AnalyzeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Not authorized");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured — pridėk savo OpenAI raktą per Secrets.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.force) {
      const { data: cached } = await supabaseAdmin
        .from("ai_error_analyses")
        .select("*")
        .eq("fingerprint", data.fingerprint)
        .maybeSingle();
      if (cached) return { cached: true, analysis: cached };
    }

    // Rate/cost limits — only enforced when we actually call the AI (cache miss or force)
    const usage = await checkLimits(supabaseAdmin as unknown as SupabaseClient, context.userId);



    const { data: samples } = await supabaseAdmin
      .from("activity_log")
      .select("created_at, meta, user_id")
      .in("action", ["client.error", "supabase.error", "app.critical", "app.warning"])
      .order("created_at", { ascending: false })
      .limit(200);

    const matching = (samples ?? []).filter(
      (r) => (r.meta as { fingerprint?: string })?.fingerprint === data.fingerprint,
    );
    if (matching.length === 0) throw new Error("Šio fingerprint klaidų nerasta (200 naujausių ribose)");

    const sample = matching[0];
    const meta = (sample.meta as Record<string, unknown>) ?? {};
    const affectedUsers = new Set(matching.map((m) => m.user_id).filter(Boolean)).size;
    const routes = Array.from(
      new Set(matching.map((m) => (m.meta as { path?: string })?.path).filter(Boolean)),
    ).slice(0, 8);
    const breadcrumbs = ((meta.breadcrumbs as unknown[]) ?? []).slice(-8);

    // Pull related samples across the fingerprint for richer context
    const timestamps = matching.map((m) => new Date(m.created_at).getTime()).sort((a, b) => a - b);
    const firstSeen = timestamps[0] ? new Date(timestamps[0]).toISOString() : "?";
    const lastSeen = timestamps.at(-1) ? new Date(timestamps.at(-1)!).toISOString() : "?";
    const uniqueMessages = Array.from(
      new Set(matching.map((m) => String((m.meta as { message?: string })?.message ?? "")).filter(Boolean)),
    ).slice(0, 3);

    const userPrompt = `Klaidos grupė (fingerprint: ${data.fingerprint})
Pasitaikymai: ${matching.length} · paveikti vartotojai: ${affectedUsers}
Pirmas įvykis: ${firstSeen} · paskutinis: ${lastSeen}
Routes: ${routes.join(", ") || "(unknown)"}

Žinutė:
${meta.message ?? "(no message)"}

${uniqueMessages.length > 1 ? `Kitos variacijos:\n- ${uniqueMessages.slice(1).join("\n- ")}\n` : ""}
Stack (pirmi 2500 simb.):
${String(meta.stack ?? "(no stack)").slice(0, 2500)}

Breadcrumbs (paskutiniai vartotojo veiksmai):
${JSON.stringify(breadcrumbs).slice(0, 900)}

Naršyklė: ${meta.browser ?? "?"} · OS: ${meta.os ?? "?"} · Įrenginys: ${meta.device ?? "?"}
Šaltinis: ${meta.source ?? "?"}
${meta.commit_sha ? `Build: ${String(meta.commit_sha).slice(0, 12)}` : ""}`;

    const model = "gpt-4o-mini";
    // Hard 10s cap — better a partial "unknown" than a 60s hang.
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 10_000);
    let resp: Response;
    try {
      resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          max_tokens: 900,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw new Error("OpenAI užklausa viršijo 10s limitą — bandyk dar kartą.");
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 401) throw new Error("OpenAI raktas negalioja — patikrink OPENAI_API_KEY.");
      if (resp.status === 429) throw new Error("OpenAI rate limit / quota — palauk arba topinkis balansą.");
      if (resp.status === 402) throw new Error("OpenAI balansas išsekęs — papildyk billing.");
      throw new Error(`OpenAI ${resp.status}: ${body.slice(0, 300)}`);
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const tokens = json.usage?.total_tokens ?? 0;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from surrounding text
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          parsed = { suggested_fix: content };
        }
      } else {
        parsed = { suggested_fix: content };
      }
    }

    const row = {
      fingerprint: data.fingerprint,
      error_message: String(meta.message ?? "").slice(0, 500),
      suspected_cause: String(parsed.suspected_cause ?? "").slice(0, 1200),
      suggested_file: String(parsed.suggested_file ?? "").slice(0, 200),
      suggested_fix: String(parsed.suggested_fix ?? "").slice(0, 2500),
      severity_estimate: String(parsed.severity_estimate ?? "medium").slice(0, 20),
      confidence: Number(parsed.confidence ?? 0.5),
      model,
      tokens_used: tokens,
      raw_response: { ...parsed, prompt_for_agent: parsed.prompt_for_agent ?? null } as unknown as never,
      updated_at: new Date().toISOString(),
    };

    const { saved, error } = await upsertAnalysis(supabaseAdmin, row);
    if (error) throw new Error(error.message);

    // Audit + count against rate limit
    await supabaseAdmin.from("activity_log").insert({
      user_id: context.userId,
      action: "ai.analysis.run",
      meta: { fingerprint: data.fingerprint, tokens, model, severity: row.severity_estimate },
    } as never);

    return {
      cached: false,
      analysis: saved,
      limits: {
        mine_today: usage.mineToday + 1,
        mine_max: LIMIT_PER_ADMIN_PER_DAY,
        global_today: usage.globalToday + 1,
        global_max: LIMIT_GLOBAL_PER_DAY,
        tokens_this_month: usage.tokensThisMonth + tokens,
        tokens_max: LIMIT_TOKENS_PER_MONTH,
      },
    };
  });


export const getAiAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ fingerprint: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Not authorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("ai_error_analyses")
      .select("*")
      .eq("fingerprint", data.fingerprint)
      .maybeSingle();
    return row;
  });


/**
 * Grąžina fingerprint'us iš paskutinių error'ų, kurie DAR NETURI AI analizės.
 * UI juos siunčia po vieną per analyzeErrorGroup (cache + limits automatiškai veikia).
 */
export const listPendingFingerprints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().min(1).max(10).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Not authorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rows } = await supabaseAdmin
      .from("activity_log")
      .select("meta, created_at")
      .in("action", ["client.error", "supabase.error", "app.critical", "app.warning"])
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: false })
      .limit(500);

    // Suskaičiuok pasitaikymus per fingerprint
    const counts = new Map<string, { count: number; last: string; message: string }>();
    for (const r of rows ?? []) {
      const meta = (r.meta as { fingerprint?: string; fingerprint_norm?: string; message?: string }) ?? {};
      const fp = meta.fingerprint;
      if (!fp) continue;
      const msg = String(meta.message ?? "");
      const norm = String(meta.fingerprint_norm ?? "");
      if (norm.startsWith("telemetry:") || /\[UI užšalo|\[lėtas API|\[ryšys dingo/i.test(msg)) continue;
      const cur = counts.get(fp);
      if (cur) cur.count += 1;
      else counts.set(fp, { count: 1, last: r.created_at, message: String(meta.message ?? "").slice(0, 200) });
    }

    // Išmesk tuos kurie jau turi analizę
    const fps = Array.from(counts.keys());
    if (fps.length === 0) return [];
    const { data: existing } = await supabaseAdmin
      .from("ai_error_analyses")
      .select("fingerprint")
      .in("fingerprint", fps);
    const done = new Set((existing ?? []).map((e: { fingerprint: string }) => e.fingerprint));

    const pending = fps
      .filter((fp) => !done.has(fp))
      .map((fp) => ({ fingerprint: fp, ...counts.get(fp)! }))
      .sort((a, b) => b.count - a.count)
      .slice(0, data.limit ?? 5);

    return pending;
  });

/**
 * Naujausios AI analizės su enrichmentu: pasitaikymai, paskutinis matymas, statusas.
 * Naudojama Auto-Fix Feed panelėje.
 */
export const listRecentAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().min(1).max(50).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Not authorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: analyses } = await supabaseAdmin
      .from("ai_error_analyses")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(data.limit ?? 20);

    if (!analyses || analyses.length === 0) return [];

    const fps = analyses.map((a: { fingerprint: string }) => a.fingerprint);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rows } = await supabaseAdmin
      .from("activity_log")
      .select("meta, user_id, created_at")
      .in("action", ["client.error", "supabase.error", "app.critical", "app.warning"])
      .gte("created_at", dayAgo)
      .limit(1000);

    const stats = new Map<string, { count: number; users: Set<string>; last: string }>();
    for (const fp of fps) stats.set(fp, { count: 0, users: new Set(), last: "" });
    for (const r of rows ?? []) {
      const fp = (r.meta as { fingerprint?: string })?.fingerprint;
      if (!fp) continue;
      const s = stats.get(fp);
      if (!s) continue;
      s.count += 1;
      if (r.user_id) s.users.add(r.user_id);
      if (!s.last || r.created_at > s.last) s.last = r.created_at;
    }

    return analyses.map((a: Record<string, unknown>) => {
      const s = stats.get(a.fingerprint as string)!;
      return {
        ...a,
        occurrences_24h: s.count,
        users_24h: s.users.size,
        last_seen: s.last || null,
      };
    });
  });

/**
 * Dabartinis AI naudojimas + limitai (be AI iškvietimo). Rodoma AI panelėje.
 */
export const getAiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Not authorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { count: mineToday } = await supabaseAdmin
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("action", "ai.analysis.run")
      .gte("created_at", dayAgo);

    const { count: globalToday } = await supabaseAdmin
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "ai.analysis.run")
      .gte("created_at", dayAgo);

    const { data: monthRows } = await supabaseAdmin
      .from("ai_error_analyses")
      .select("tokens_used")
      .gte("updated_at", monthStart);
    const tokensThisMonth = (monthRows ?? []).reduce(
      (s: number, r: { tokens_used: number | null }) => s + (Number(r.tokens_used) || 0),
      0,
    );

    const { count: totalAnalyses } = await supabaseAdmin
      .from("ai_error_analyses")
      .select("fingerprint", { count: "exact", head: true });

    // Rough cost: gpt-4o-mini ~ $0.15/1M input + $0.60/1M output. Blended ~$0.40/1M.
    const estCostUsd = (tokensThisMonth / 1_000_000) * 0.4;

    return {
      mine_today: mineToday ?? 0,
      mine_max: LIMIT_PER_ADMIN_PER_DAY,
      global_today: globalToday ?? 0,
      global_max: LIMIT_GLOBAL_PER_DAY,
      tokens_this_month: tokensThisMonth,
      tokens_max: LIMIT_TOKENS_PER_MONTH,
      est_cost_usd: estCostUsd,
      total_analyses: totalAnalyses ?? 0,
      model: "gpt-4o-mini",
    };
  });

