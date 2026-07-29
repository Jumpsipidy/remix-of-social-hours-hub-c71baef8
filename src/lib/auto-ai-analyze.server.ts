import { upsertAnalysis } from "@/lib/ai-analysis-store.server";
// Server-only helper. Called from escalateAppError to run instant AI analysis
// on new error groups and post a follow-up Discord embed with the diagnosis.
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

async function postDiscord(url: string, body: unknown): Promise<void> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
  } catch (err) {
    console.error("[auto-ai discord] failed", err);
  }
}

function trim(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export async function autoAnalyzeAndAlert(input: AutoInput): Promise<void> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!openaiKey) return; // nothing to do without an OpenAI key

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1) Cache — skip if fresh analysis already exists
  const { data: cached } = await supabaseAdmin
    .from("ai_error_analyses")
    .select("fingerprint, suspected_cause, suggested_file, suggested_fix, severity_estimate, confidence, updated_at, raw_response")
    .eq("fingerprint", input.fingerprint)
    .maybeSingle();

  const now = Date.now();
  const cachedAt = cached?.updated_at ? new Date(cached.updated_at).getTime() : 0;
  const isFresh = cached && now - cachedAt < AUTO_ANALYSIS_TTL_MS;

  let analysis = cached as null | {
    fingerprint: string;
    suspected_cause: string | null;
    suggested_file: string | null;
    suggested_fix: string | null;
    severity_estimate: string | null;
    confidence: number | null;
    updated_at?: string | null;
    raw_response?: Record<string, unknown> | null;
  };

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
      return;
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
        return;
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
        confidence: Number(parsed.confidence ?? 0.5),
        model: "gpt-4o-mini",
        tokens_used: tokens,
        raw_response: { ...parsed, prompt_for_agent: parsed.prompt_for_agent ?? null } as unknown as never,
        updated_at: new Date().toISOString(),
      };
      const { saved, error: saveError } = await upsertAnalysis(supabaseAdmin, row);
      if (saveError) {
        console.error("[auto-ai] save failed", saveError.message);
        return;
      }
      analysis = (saved as typeof analysis) ?? { ...row, updated_at: row.updated_at } as typeof analysis;

      await supabaseAdmin.from("activity_log").insert({
        action: "ai.analysis.auto",
        entity_type: "auto-monitor",
        meta: { fingerprint: input.fingerprint, tokens, level: input.level, path: input.path ?? null },
      } as never);
    } catch (err) {
      console.error("[auto-ai] threw", err);
      return;
    }
  }

  // 4) Discord follow-up embed
  if (!discordUrl || !analysis) return;
  const promptForAgent = (analysis.raw_response as { prompt_for_agent?: string } | null)?.prompt_for_agent ?? "";
  const sev = (analysis.severity_estimate ?? input.level).toLowerCase();
  const sevColor =
    sev === "critical" ? 0xef4444 :
    sev === "high" ? 0xf97316 :
    sev === "medium" ? 0xeab308 :
    0x38bdf8;
  const conf = Math.round((analysis.confidence ?? 0) * 100);
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Priežastis", value: trim(analysis.suspected_cause || "(nepavyko nustatyti)", 1000) },
  ];
  if (analysis.suggested_file) {
    fields.push({ name: "Failas", value: `\`${trim(analysis.suggested_file, 200)}\``, inline: true });
  }
  fields.push({ name: "Sunkumas", value: `**${sev.toUpperCase()}** · ${conf}% pasitikėjimas`, inline: true });
  if (analysis.suggested_fix) {
    fields.push({ name: "Fix žingsniai", value: trim(analysis.suggested_fix, 1024) });
  }
  if (promptForAgent) {
    fields.push({ name: "Super-promptas Lovable agentui", value: "```" + trim(promptForAgent, 900) + "```" });
  }

  await postDiscord(discordUrl, {
    username: "Socialinės Valandos · AI",
    avatar_url: "https://socialinesvalandos.dev/apple-touch-icon.png",
    embeds: [
      {
        author: {
          name: isFresh ? "🧠 AI diagnozė · (cache)" : "🧠 AI diagnozė · instant",
          url: "https://socialinesvalandos.dev/admin/autofix",
        },
        title: `AI: ${trim(input.message, 220)}`,
        color: sevColor,
        fields,
        footer: {
          text: `Fingerprint: ${input.fingerprint} · Model: gpt-4o-mini · Kopijuoti promptą /admin/autofix`,
        },
        url: "https://socialinesvalandos.dev/admin/autofix",
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
