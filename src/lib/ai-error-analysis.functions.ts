import { createServerFn } from "@tanstack/react-start";
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
    .eq("actor_id", userId)
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
      .limit(300);

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
Stack (pirmi 3000 simb.):
${String(meta.stack ?? "(no stack)").slice(0, 3000)}

Breadcrumbs (paskutiniai vartotojo veiksmai):
${JSON.stringify(breadcrumbs).slice(0, 1000)}

Naršyklė: ${meta.browser ?? "?"} · OS: ${meta.os ?? "?"} · Įrenginys: ${meta.device ?? "?"}
Šaltinis: ${meta.source ?? "?"}
${meta.commit_sha ? `Build: ${String(meta.commit_sha).slice(0, 12)}` : ""}`;

    const model = "gpt-4o-mini";
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

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

    const { data: saved, error } = await supabaseAdmin
      .from("ai_error_analyses")
      .upsert(row as never, { onConflict: "fingerprint" })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Audit + count against rate limit
    await supabaseAdmin.from("activity_log").insert({
      actor_id: context.userId,
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
