# 🧠 AI Auto-Fix — kaip veikia klaidų analizė

Ne Lovable AI. Ne gateway. **Tiesiogiai OpenAI**, tavo pačių raktu.

---

## TL;DR

Kai admin panelyje `admin/errors` spusteli **„Analizuoti su AI"**, serveris:

1. Paima klaidos grupę (fingerprint) iš `activity_log`.
2. Sudeda kontekstą: stack, breadcrumbs, routes, browser/OS, paveikti vartotojai, first/last seen, variacijos.
3. Siunčia į **OpenAI Chat Completions API** (`gpt-4o-mini`, `response_format: json_object`, `temperature: 0.2`).
4. Rezultatą įrašo į `ai_error_analyses` (upsert pagal `fingerprint`) → cache'inasi.
5. Grąžina: `suspected_cause`, `suggested_file`, `suggested_fix`, `prompt_for_agent`, `severity_estimate`, `confidence`.

Antras klikas ant to paties fingerprint = **cache hit**, 0 tokenų.

---

## Kur gyvena kodas

| Failas | Ką daro |
|---|---|
| `src/lib/ai-error-analysis.functions.ts` | `analyzeErrorGroup` + `getAiAnalysis` server funkcijos |
| `src/routes/admin.errors.tsx` → `AiAnalysisCard` | UI mygtukai: „Analizuoti", „Force refresh", copy „⚡ Auto-fix promptas" |
| Supabase lentelė `ai_error_analyses` | cache + istorija |

---

## Konfigūracija

**Reikia vieno secreto:** `OPENAI_API_KEY` (prasideda `sk-...`).

Nustatoma per Lovable Secrets UI arba `add_secret` — tas pats env kintamasis pasiekiamas visose server funkcijose. **Lovable API key nebenaudojamas** analizei.

Nori pakeisti modelį? Redaguok `const model = "gpt-4o-mini"` faile `ai-error-analysis.functions.ts`. Rekomenduojami:
- `gpt-4o-mini` — default, pigus (~$0.15/1M input), pakankamas 95% atvejų
- `gpt-4o` — kai reikia tvirtesnės logikos analizės
- `gpt-4.1-mini` — naujesnis balansas kaina/kokybė

---

## Limitai (apsauga nuo runaway cost)

Hardcoded `ai-error-analysis.functions.ts`:

| Limitas | Reikšmė | Ką daro |
|---|---|---|
| `LIMIT_PER_ADMIN_PER_DAY` | 30 | Vienas adminas ne daugiau 30 analizių / 24h |
| `LIMIT_GLOBAL_PER_DAY` | 150 | Visi adminai kartu — 150 / 24h |
| `LIMIT_TOKENS_PER_MONTH` | 2 000 000 | ~$0.30–1 per mėnesį su gpt-4o-mini |

**Cache hits neskaičiuojami.** Limitai tikrinami tik prieš realų OpenAI call'ą (cache miss arba `force: true`).

Perkirti limitą → naudotojas mato lietuvišką error toast'ą (ne generic 500).

---

## Prompt structure

**System prompt** (`SYSTEM_PROMPT`):
- Nurodo tech stack (TanStack Start, Supabase, framer-motion, pdf-lib, zxing)
- Reikalauja atsakymo TIK JSON formatu (be markdown fence)
- Prašo lietuvių kalba, konkrečiai, jokių haliucinacijų

**User prompt** siunčia:
- Fingerprint + statistika (pasitaikymai, paveikti vartotojai, first/last seen)
- Klaidos žinutę + iki 3 variacijų
- Stack trace (3000 simb.)
- Breadcrumbs (paskutiniai 8 vartotojo veiksmai, iki 1000 simb.)
- Browser / OS / device / commit SHA

---

## „⚡ Auto-fix su Lovable agentu"

AI grąžina `prompt_for_agent` — READY-TO-PASTE lietuvišką instrukciją. UI parodo copy mygtuką: nukopijuoji į Lovable chat'ą ir agentas pats ištaiso bug'ą (žino failą, priežastį, laukiamą elgesį).

Tai **hybrid workflow**: OpenAI diagnozuoja, Lovable agentas taiso. Cheap + fast.

---

## Cache elgesys

- `analyzeErrorGroup({ fingerprint })` be `force` → grąžina cached įrašą jei egzistuoja
- `analyzeErrorGroup({ fingerprint, force: true })` → visada eina į OpenAI, perrašo cache
- Cache invalidatinasi TIK per `force` — jei kodas pasitaisė ir norite naujos analizės, spauskite „🔄 Force refresh"

---

## Debug / troubleshooting

**„OPENAI_API_KEY not configured"** → pridėk secretą per Lovable UI.

**„OpenAI 401"** → raktas negalioja arba atšauktas, pergeneruok OpenAI dashboarde.

**„OpenAI 429"** → arba rate limit (per daug per minutę), arba quota/billing baigėsi. Patikrink https://platform.openai.com/usage.

**AI grąžina blogą JSON** → yra fallback: kodas ištraukia `{...}` iš atsakymo regex'u, jei visai nepavyksta — deda visą tekstą į `suggested_fix`. Nepaskęsta.

**„Šio fingerprint klaidų nerasta"** → paskutinių 300 activity_log įrašų nėra šio fingerprint. Klaida senesnė nei paskutiniai 300 error'ų — palauk, kol pasikartos, arba pravalyk senus.

---

## Audit trail

Kiekvienas AI call'as loginamas į `activity_log`:
```json
{
  "action": "ai.analysis.run",
  "actor_id": "<admin-uuid>",
  "meta": { "fingerprint": "...", "tokens": 1234, "model": "gpt-4o-mini", "severity": "high" }
}
```

Rate limiter skaito tą patį lentelę → self-consistent, jokio atskiro counterio.

---

## Ką daryti jei nori pakeisti provider'į

Visa AI logika izoliuota `ai-error-analysis.functions.ts` `.handler()` viduje. Nori Anthropic / Groq / local Ollama? Keiskite tik `fetch(...)` bloką ir `model` konstantą — likusi struktūra (cache, limitai, audit, UI) nesikeičia.
