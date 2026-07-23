# 🛡️ Friendly Error Screen + Bug-Catcher Bridge

## Ką mokinys mato dabar (vietoj default raudonos klaidos)

Kai bet kuriame puslapyje krenta React klaida arba loader'is meta exception'ą,
mokinys **nebemato** stack trace ar „Application error" žinutės. Vietoj to
matomas ramus glassmorphism ekranas su:

- 🛠️ animuota „Taisoma…" pulsuojančia žymele
- **Incidento ID** (pvz. `#a3f2c19`) — tas pats fingerprint, kurį matai
  `/admin/errors` — mokinys gali jį pasakyti ir tu iškart randi grupę
- Aiški žinutė: **„Mūsų sistema jau automatiškai pranešė adminui"** — mokinys
  nesipiktina, nes žino, kad tai jau tvarkoma
- Mygtukai „Bandyti dar" (invalidate + reset) ir „Į pradžią"

Tas pats ekranas naudojamas:
- **Route errorComponent** (`__root.tsx`) — bet kurio puslapio klaida
- **Router defaultErrorComponent** (`router.tsx`) — loader'ių klaidos
- **SSR fallback** (`src/lib/error-page.ts`) — kai lūžta net prieš React

Ekrano `useEffect` **automatiškai** iškviečia `logClientError()` su tuo pačiu
incident ID → klaida atsiduria `activity_log` ir `/admin/errors` per sekundę.

## Kaip mes gaudom „Lovable default error" (ir kitas overlay klaidas)

`LovableOverlayBridge` (`src/components/lovable-overlay-bridge.tsx`) veikia
kiekviename puslapyje ir gaudo **3 skirtingais būdais**:

### 1. Žinomos overlay komponentės (DOM selectors)
Skenuoja DOM ieškodama:
- `vite-error-overlay` (Vite HMR raudona)
- `nextjs-portal` / `[data-nextjs-dialog-overlay]` (Next.js)
- `[data-lovable-error-overlay]` / `[data-lovable-overlay]` (Lovable preview)
- `[data-remix-error-boundary]`, webpack-dev-server overlay, `iframe[title*=error]`

### 2. Euristika bet kokiam raudonam dialogui
Jei atsiveria `[role=dialog]` arba `[role=alertdialog]` ir jo tekste yra:
`runtime error`, `unhandled runtime`, `syntaxerror`, `typeerror:`,
`compilation error`, `failed to compile` — laikom klaida ir siunčiam.

Tai apima **bet ką**, ką kada nors sugalvos parodyti bet koks tooling — net
tokį, kurio neatpažįstam pagal selector.

### 3. Parent frame bridge (`postMessage`)
Lovable preview draugauja per iframe. Kai tėvinis frame'as siunčia
`{type: "error"|"exception"|"vite:error"|"lovable:error", message, stack}`, mes
klausom `window.message`, ir tokias klaidas irgi persiunčiam į
`/admin/errors`. Todėl **jei kada Lovable parodys default overlay** — mums
nebūtinai reikia jį matyti DOM'e, gauname signal per parent frame.

## Auto-report + rankinis mygtukas
Radęs overlay:
1. **Iš karto** kviečia `logClientError()` (dedupinama pagal signature) —
   nereikia mokiniui nieko spausti
2. Rodo mažą floating pill viršuje: „Overlay klaida — siųsti į /admin/errors".
   Paspaudimas re-forward'ina (naudinga, jei nori priversti pasirodyti antrą
   kartą pilnesniam kontekstui)

## Ką tai reiškia praktiškai

- Mokinys **niekada nemato „Application error"** raudono ekrano
- Kiekviena klaida, kurią jis mato, jau **automatiškai** yra `/admin/errors`
- Fingerprint ID leidžia jam ir tau kalbėti apie **tą pačią** klaidą
- Rage-lygis ↓, Discord/email lygis ↑

## Susiję failai
- `src/components/friendly-error.tsx` — bendras ekranas
- `src/lib/error-page.ts` — SSR fallback (raw HTML)
- `src/routes/__root.tsx` + `src/router.tsx` — boundary wiring
- `src/components/lovable-overlay-bridge.tsx` — overlay gaudymas
