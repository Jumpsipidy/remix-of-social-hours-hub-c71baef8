import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnalyzeInput = z.object({
  fingerprint: z.string().min(1),
  force: z.boolean().optional(),
});

const SYSTEM_PROMPT = `Tu esi ekspertas debuggeris "Socialinės Valandos" projektui.
Tech stack: TanStack Start (React 19 + TypeScript), Tailwind v4, Supabase (PostgreSQL + RLS), Vercel Edge, framer-motion.
Kalbėk lietuviškai. Būk konkretus ir trumpas.

Analizuok pateiktą klaidos grupę ir grąžink JSON su:
{
  "suspected_cause": "1-2 sakiniai kas greičiausiai kaltas",
  "suggested_file": "src/... failo kelias arba 'unknown'",
  "suggested_fix": "konkretūs 2-4 žingsniai kaip ištaisyti (numeruoti)",
  "severity_estimate": "critical|high|medium|low",
  "confidence": 0.0-1.0
}`;

export const analyzeErrorGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AnalyzeInput.parse(data))
  .handler(async ({ data, context }) => {
    // Verify admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Not authorized");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check cache unless force
    if (!data.force) {
      const { data: cached } = await supabaseAdmin
        .from("ai_error_analyses")
        .select("*")
        .eq("fingerprint", data.fingerprint)
        .maybeSingle();
      if (cached) return { cached: true, analysis: cached };
    }

    // Fetch recent occurrences of this fingerprint
    const { data: samples } = await supabaseAdmin
      .from("activity_log")
      .select("created_at, meta, user_id")
      .eq("action", "error")
      .order("created_at", { ascending: false })
      .limit(200);

    const matching = (samples ?? []).filter(
      (r) => (r.meta as { fingerprint?: string })?.fingerprint === data.fingerprint,
    );
    if (matching.length === 0) throw new Error("No error samples found for this fingerprint");

    const sample = matching[0];
    const meta = (sample.meta as Record<string, unknown>) ?? {};
    const affectedUsers = new Set(matching.map((m) => m.user_id).filter(Boolean)).size;
    const routes = Array.from(new Set(matching.map((m) => (m.meta as { path?: string })?.path).filter(Boolean))).slice(0, 5);

    const userPrompt = `Klaidos grupė (fingerprint: ${data.fingerprint})
Pasitaikymai: ${matching.length}, paveikti vartotojai: ${affectedUsers}
Routes: ${routes.join(", ") || "(unknown)"}

Žinutė:
${meta.message ?? "(no message)"}

Stack (pirmi 3000 simbolių):
${String(meta.stack ?? "(no stack)").slice(0, 3000)}

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
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`OpenAI ${resp.status}: ${body.slice(0, 300)}`);
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const tokens = json.usage?.total_tokens ?? 0;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { suggested_fix: content };
    }

    const row = {
      fingerprint: data.fingerprint,
      error_message: String(meta.message ?? "").slice(0, 500),
      suspected_cause: String(parsed.suspected_cause ?? "").slice(0, 1000),
      suggested_file: String(parsed.suggested_file ?? "").slice(0, 200),
      suggested_fix: String(parsed.suggested_fix ?? "").slice(0, 2000),
      severity_estimate: String(parsed.severity_estimate ?? "medium").slice(0, 20),
      confidence: Number(parsed.confidence ?? 0.5),
      model,
      tokens_used: tokens,
      raw_response: parsed as unknown as never,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabaseAdmin
      .from("ai_error_analyses")
      .upsert(row as never, { onConflict: "fingerprint" })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return { cached: false, analysis: saved };
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
