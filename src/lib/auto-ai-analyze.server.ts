import { normalizeConfidenceForStorage, upsertAnalysis } from "@/lib/ai-analysis-store.server";
// Server-only helper. Called from escalateAppError to run instant AI analysis
// on new error groups and return the diagnosis to the caller so the first
// Discord/email alert already contains the AI result (no duplicate follow-up).
//
// Safe rate limiting: caches one row per fingerprint in ai_error_analyses and
// skips re-analysis if the row was updated in the last 6h. Also global daily
// cap of 80 auto analyses (system-triggered) per 24h to protect OpenAI cost.

const AUTO_ANALYSIS_TTL_MS = 6 * 60 * 60 * 1000;
const AUTO_GLOBAL_DAILY_CAP = 80;

const AUTO_SYSTEM_PROMPT = `Tu esi ekspertas debuggeris "Socialinės Valandos" projektui (TanStack Start + React 19 + Supabase + Tailwind v4 + framer-motion).
Kalbėk lietuviškai, konkrečiai, be išsigalvojimų. Jei nesi tikras — "hipotezė".
Grąžink TIKTAI validų JSON (be markdown, be code fence):
{
  "suspected_cause": "1-2 sakiniai — kas kaltas",
  "suggested_file": "src/... arba 'unknown'",
  "suggested_fix": "3-5 numeruoti žingsniai su konkrečia funkcija/eilute",
  "prompt_for_agent": "PILNAS super-promptas Lovable agentui LT (4-6 sakiniai). Struktūra: kontekstas → failas/eilutė → priežastis → fix → testas.",
  "severity_estimate": "critical|high|medium|low",
  "confidence": 0.0-1.0
}`;

type AutoInput = {
  fingerprint: string;
  message: string;
  stack?: string | null;
  path?: string | null;
  userEmail?: string | null;
  level: "critical" | "warning";
};

export type AutoAnalysisResult = {
  fingerprint: string;
  suspected_cause: string | null;
  suggested_file: string | null;
  suggested_fix: string | null;
  severity_estimate: string | null;
  confidence: number | null;
  updated_at?: string | null;
  raw_response?: Record<string, unknown> | null;
};

export async function autoAnalyzeAndAlert(input: AutoInput): Promise<AutoAnalysisResult | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null; // nothing to do without an OpenAI key

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1) Cache — skip if fresh analysis already exists
  const { data: cached } = await supabaseAdmin
    .from("ai_error_analyses")
    .select("*")
    .eq("fingerprint", input.fingerprint)
    .maybeSingle();

  const now = Date.now();
  const cachedAt = cached?.updated_at ? new Date(cached.updated_at).getTime() : 0;
  const isFresh = cached && now - cachedAt < AUTO_ANALYSIS_TTL_MS;

  let analysis = cached as AutoAnalysisResult | null;

  if (!isFresh) {
    // 2) Global daily cap
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const { count: todayCount } = await supabaseAdmin
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "ai.analysis.auto")
      .gte("created_at", dayAgo);
    if ((todayCount ?? 0) >= AUTO_GLOBAL_DAILY_CAP) {
      console.warn("[auto-ai] daily cap hit", todayCount);
      return analysis;
    }

    // 3) Call OpenAI
    const userPrompt = `Klaidos grupė (fingerprint: ${input.fingerprint})
Lygis: ${input.level}
Puslapis: ${input.path ?? "?"}
Vartotojas: ${input.userEmail ?? "(anon)"}

Žinutė:
${input.message}

Stack (pirmi 2500 simb.):
${(input.stack ?? "(no stack)").slice(0, 2500)}`;

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: AUTO_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!resp.ok) {
        console.error("[auto-ai] openai", resp.status, await resp.text().catch(() => ""));
        return analysis;
      }
      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content ?? "{}";
      const tokens = json.usage?.total_tokens ?? 0;
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(content); } catch { parsed = { suggested_fix: content }; }

      const row = {
        fingerprint: input.fingerprint,
        error_message: input.message.slice(0, 500),
        suspected_cause: String(parsed.suspected_cause ?? "").slice(0, 1200),
        suggested_file: String(parsed.suggested_file ?? "").slice(0, 200),
        suggested_fix: String(parsed.suggested_fix ?? "").slice(0, 2500),
        severity_estimate: String(parsed.severity_estimate ?? input.level).slice(0, 20),
        confidence: normalizeConfidenceForStorage(parsed.confidence ?? 0.5),
        model: "gpt-4o-mini",
        tokens_used: tokens,
        raw_response: { ...parsed, prompt_for_agent: parsed.prompt_for_agent ?? null } as unknown as never,
        updated_at: new Date().toISOString(),
      };
      const { saved, error: saveError } = await upsertAnalysis(supabaseAdmin, row);
      if (saveError) {
        console.error("[auto-ai] save failed", saveError.message);
        return analysis;
      }
      analysis = (saved as typeof analysis) ?? { ...row, updated_at: row.updated_at } as typeof analysis;

      await supabaseAdmin.from("activity_log").insert({
        action: "ai.analysis.auto",
        entity_type: "auto-monitor",
        meta: { fingerprint: input.fingerprint, tokens, level: input.level, path: input.path ?? null },
      } as never);
    } catch (err) {
      console.error("[auto-ai] threw", err);
      return analysis;
    }
  }

  return analysis;
}
