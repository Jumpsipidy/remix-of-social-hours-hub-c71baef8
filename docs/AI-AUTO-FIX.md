# 🤖 AI klaidų analizė + Auto-fix

Kaip veikia AI klaidų analizė "Socialinės Valandos" projekte, ką ji daro, kiek kainuoja ir kaip apsisaugom nuo runaway cost'o.

---

## TL;DR (labai trumpai)

- Kai atsiranda klaida → Admin/Error centre spausi 🤖 **Analizuoti**
- Gemini 3.5 Flash per Lovable AI Gateway paima klaidos kontekstą (žinutę, stack, breadcrumbs, routes, browserį) ir per ~2s grąžina JSON su priežastim + fix žingsniais + **ready-to-paste prompt'u Lovable agentui**
- Spausi ⚡ **Kopijuoti prompt'ą** → įklijuoji į Lovable chat → agentas ištaiso
- Rezultatas cache'inamas — antras skaitymas nemokamas
- Yra griežti limitai kad kreditai neišbėgtų (žr. žemiau)

---

## Kur tai vyksta

**Failai:**
- `src/lib/ai-error-analysis.functions.ts` — serverio funkcijos (`analyzeErrorGroup`, `getAiAnalysis`)
- `src/routes/admin.errors.tsx` → `AiAnalysisCard` — UI kortelė kortelės viduje `DetailModal`
- Lentelė: `ai_error_analyses` (Supabase, kešas pagal `fingerprint`)

**Modelis:** `google/gemini-3.5-flash` per `https://ai.gateway.lovable.dev/v1` (Lovable AI Gateway, `LOVABLE_API_KEY` serveryje).

**Kodėl Gemini Flash:** greitas (~2s), pigus (~$0.10/1M input tokens), tinkamas struktūriniam JSON output'ui. Realiai vienas analizavimas kainuoja mažiau nei centą.

---

## Ką AI mato

Serveris paima **paskutinį šio fingerprint'o klaidos įvykį** iš `activity_log` ir siunčia AI:

- `message` — pilna klaidos žinutė
- `stack` (pirmi 2500 simb.) — kur JS crash'ino
- `breadcrumbs` (paskutiniai 8 vartotojo veiksmai) — kas buvo prieš crash
- `routes` — kuriose route'ose vyksta
- `browser`, `os`, `device` — aplinka
- `commit_sha` — kuriame build'e
- Bendra: pasitaikymų skaičius + paveiktų vartotojų skaičius

Sistem prompt'as sako AI kad tai TanStack Start + React 19 + Supabase RLS projektas, kad kalbėtų lietuviškai ir grąžintų **TIK validų JSON** be markdown.

---

## Ką AI grąžina

JSON su 6 laukais:

```json
{
  "suspected_cause": "Trumpa priežastis (1-2 sakiniai)",
  "suggested_file": "src/routes/organization.tsx",
  "suggested_fix": "1. Patikrink...\n2. Pridėk...\n3. Testuok su...",
  "prompt_for_agent": "READY-TO-PASTE prompt'as Lovable agentui...",
  "severity_estimate": "critical|high|medium|low",
  "confidence": 0.85
}
```

Jei AI grąžina text (ne JSON), regex bando ištraukti `{...}`. Jei ir tai nepavyksta — visas atsakymas patenka į `suggested_fix`.

---

## ⚡ Auto-fix workflow

Naujausia feature — vienu paspaudimu paruošiamas kontekstas Lovable agentui:

1. Admin centre atveri klaidą → matai violetinę **AI analizė + auto-fix** kortelę
2. Spausi 🤖 **Analizuoti** (jei dar niekas nedarė) — AI atsako per ~2s
3. Matai priežastį, failą, fix žingsnius
4. Spausi ⚡ **Kopijuoti prompt'ą** (violetinis mygtukas kortelės apačioje)
5. Atidarai Lovable chat, `Ctrl+V` → agentas gauna:
   - Failą kur ieškoti
   - Klaidos žinutę
   - Tikėtiną priežastį
   - Konkrečius fix žingsnius
   - Instrukciją: "ištaisyk pagrindinę priežastį, verifikuok su tsgo, grąžink santrauką"
6. Agentas dirba, tu tik peržiūri commit'ą

**Fallback:** jei AI neįdėjo `prompt_for_agent` (senesnis cache), UI pats sugeneruoja jį iš `suspected_cause` + `suggested_fix` + failo kelio.

---

## 💰 LIMITAI (protection nuo runaway cost)

Trys sluoksniai apsaugos — jei kuris nors pasiektas, `analyzeErrorGroup` throw'ina aiškų LT error'ą **prieš** paskambinant AI:

| Limitas | Reikšmė | Kur skaičiuojama |
|---|---|---|
| **Per-admin/dieną** | 30 analizių/24h vienam admin'ui | `activity_log` kur `action='ai.analysis.run'` ir `actor_id=<tu>` |
| **Global/dieną** | 150 analizių/24h visame workspace | `activity_log` kur `action='ai.analysis.run'` |
| **Mėnesio token'ai** | 2,000,000 total tokens/mėn | `ai_error_analyses.tokens_used` sum nuo mėnesio pradžios |

**Svarbu:**
- Cache hit'ai (grąžinama iš `ai_error_analyses` be naujos AI užklausos) **NEEINA** į limitą — todėl gali atidaryti tą pačią klaidą 100 kartų nemokamai
- `force: true` (mygtukas "Iš naujo") apeina cache **bet ne limitus** — vis tiek eina į skaitiklį
- Kai limitas viršytas, matai konkretų error'ą UI (pvz. *"Pasiekei savo dienos limitą (30 AI analizių/24h). Bandyk rytoj."*)

**Kodėl būtent tokie skaičiai:**
- 30/admin/dieną = pilnai užtenka net produktyvią dieną (retai 30 skirtingų bug'ų per dieną)
- 150 global = safety net jei 5 admin'ai vienu metu spam'ina
- 2M token'ų/mėn ≈ 3000-5000 analizių, kainuoja ~€1-2 iš Lovable credits

**Kaip pakeisti:** `src/lib/ai-error-analysis.functions.ts`, konstantos viršuje failo:

```ts
const LIMIT_PER_ADMIN_PER_DAY = 30;
const LIMIT_GLOBAL_PER_DAY = 150;
const LIMIT_TOKENS_PER_MONTH = 2_000_000;
```

**Bonus:** funkcija grąžina `limits` objektą (`mine_today`, `global_today`, `tokens_this_month` ir jų max'us) — galima UI parodyti live meterį jei norėsis.

---

## Kešas

Lentelė `ai_error_analyses` su unique key ant `fingerprint`. Kai AI grąžina — `upsert`. Skaitymas:

- **`getAiAnalysis({ fingerprint })`** — grąžina keše esantį įrašą arba `null`. UI `useEffect` iškviečia iškart kai atidarai klaidos kortelę → matai jei jau kažkas analizavo.
- **`analyzeErrorGroup({ fingerprint, force: false })`** — jei keše yra, grąžina `{cached: true, ...}` be AI užklausos. Jei nėra — kviečia AI.
- **`analyzeErrorGroup({ fingerprint, force: true })`** — apeina cache, kviečia AI iš naujo (limitai galioja).

Kešas niekada neišvalomas automatiškai — jei norit refresh'inti, spauskit "Iš naujo".

---

## Sauga / RLS

- `analyzeErrorGroup` middleware = `requireSupabaseAuth` + rankinis `has_role('admin')` check → **tik super admin'ai gali paleisti**
- `getAiAnalysis` toks pats check
- `LOVABLE_API_KEY` skaitomas TIK `.handler()` viduje serveryje, niekada nepatenka į klientą
- Klaidos meta gali turėti user PII (email breadcrumbs'e) — todėl visa tai eina tik į Google Gemini per Lovable Gateway, kuris turi savo enterprise privacy setup'ą. **Neprivedam prie OpenAI.**

---

## Kaip debugginti kai AI neveikia

| Simptomas | Priežastis | Fix |
|---|---|---|
| `LOVABLE_API_KEY not configured` | Env variable nėra Vercel'yje | Susigeneruok naują per `lovable_api_key--create`, įdėk į Vercel env |
| `Lovable AI kreditai baigėsi` | 402 iš gateway | Papildyk Lovable workspace kreditus |
| `Per daug užklausų — bandyk po minutės` | 429 rate limit iš Gemini | Palauk minutę |
| `Šio fingerprint klaidų nerasta` | Klaida per sena (>200 naujausių įrašų) | Palauk kol pasikartos arba padidink `.limit(300)` |
| `Pasiekei savo dienos limitą` | Pats sau 30/24h | Kitą dieną arba padidink konstantą |
| AI grąžina bruožtą tekstą, ne JSON | Modelio hallucination | UI parodo pilną tekstą po "Siūlomi žingsniai" — vis tiek useful |

---

## Ateities galimybės (dar nepadaryta)

- **Auto-analyze on new error** — kai atsiranda nauja klaida su ≥3 pasitaikymais, automatiškai paleisti AI be admin paspaudimo (limitai apsaugos)
- **Auto-apply via GitHub PR** — po AI analizės sugeneruoti PR'ą su fix'u tiesiai į repo
- **Pattern learning** — po X ištaisytų klaidų, AI mokosi iš `resolved` grupių ir siūlo pattern'us naujoms panašioms klaidoms
- **Live limit meter UI** — parodyti admin'ui "Šiandien: 12/30 · Šį mėnesį: 340K/2M tokens"

Šitos idėjos nėra būtinos — dabartinis flow'as jau padengia 95% real use case'ų.
