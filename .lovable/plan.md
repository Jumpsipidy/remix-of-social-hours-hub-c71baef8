# Planas: greitis + mobile + org onboarding UI

## Tikslas
1. Išgaudyti ir sutvarkyti didžiausius mobile/performance trukumus.
2. Sukurti gražią, vedlys-pagrįstą organizacijos onboarding UI, kad nauja organizacija žinotų ką daryti pirmą kartą prisijungus.

## 1. Performance & mobile audit

### A. Bundle ir kritinis kelias
- Peržiūrėti `vite.config.ts` — įsitikinti, kad `manualChunks` skiria `recharts`, `framer-motion`, `lucide-react` icon subsets, `qrcode`, `pdf-lib` nuo pagrindinio bundle.
- Įjungti route-level code-splitting auditą per `bun run build` ir pažiūrėti build output.
- Patikrinti, ar `src/routes/organization.tsx` neimportuoja nereikalingų sunkių bibliotekų (pvz. `recharts` galima lazy-loadinti analytics tabe).

### B. Mobile konkretūs fixai
- `MobileTabBar` rodyti 4 mygtukus, bet kai kurie labelai per ilgi / per maži — padidinti touch target iki 44px, sutrumpinti labelus: „Pultas", „Užd.", „Skenuoti", „Profilis".
- Pritaikyti `env(safe-area-inset-bottom)` — patikrinti, ar body turi `padding-bottom` kai `MobileTabBar` matomas.
- Išjungti tilt / blur efektus ant silpnesnių įrenginių (prefers-reduced-motion + mobile match).
- Sumažinti Framer Motion blur/floating dalelių skaičių ant ekrano < 640px.

### C. LCP / Core Web Vitals
- Pridėti `preload` hero image ir svarbiausiems fontams `__root.tsx` / `index.tsx` head.
- Perkelti nereikalingas heavy assets (Remotion MP4s, video) į lazy load (intersection observer).
- Įjungti `loading="lazy"` ir `decoding="async"` visuose `img` elementuose.
- Patikrinti, ar ` celebration-overlay` nerenderina `<video>` prefetchinant visus 22 MP4.

### D. Touch & keyboard
- Patikrinti visus form inputus mobile: pašalinti iOS zoom (`font-size: 16px`), padidinti `min-h` laukams.
- Įsitikinti, kad mygtukai turi `active:scale-95` ir `touch-action: manipulation`.

## 2. Organizacijos onboarding UI

### A. Kontekstas
Dabar organizacija užsiregistravusi / patvirtinta patenka tiesiai į `/organization` su pilnu dashboard. Tai yra overwhelming. Sukurti `/organization/welcome` (arba modal/wizard) kuris:
- Pasitinka su vardu ir organizacijos pavadinimu.
- Paaiškina 3 žingsnius: 1) sukurti pirmą užduotį, 2) atsisiųsti/paruošti QR skenavimą, 3) peržiūrėti studentų užklausas.
- Turi „praleisti" ir „kitą kartą neberodyti".

### B. Vedlys (3 žingsniai)
1. **Profilis ir pirmoji užduotis** — mini form inline, su Mapillary/address picker pagalba, žymės, valandos. Kai išsaugoma, animuotas success + pereinama į 2.
2. **QR ir kaip skenuoti** — parodyti QR code pavyzdį, paaiškinti, kad mokinys ateina su QR arba 6 skaitmenų kodu, ir kad skenuoti galima per `/organization/scan`.
3. **Pirmoji rezervacija** — jei yra `pending` rezervacijų, rodyti jas ir raginti patvirtinti; jei nėra, rodyti „laukiame pirmų mokinių" su linku į `/tasks`.

### C. UI reikalavimai
- Mobile-first: bottom sheet stilius žingsnelis ant telefono, side panel ant desktop.
- Naudoti tik projekto design tokens — jokių hardcoded spalvų.
- Integruoti su esamu `OnboardingTour` storage mechanizmu (`sv_onboarding_v6`), bet atskiru raktu `sv_org_onboarding_v1`.
- Animacijos: slide-in iš apačios, progress bar, icon morphing.

### D. Duomenų sauga
- Onboarding formos duomenys saugomi per server function (createTask server fn), ne tiesiogiai klientu.
- Tikrinti, ar user turi `role === "organization"`.

## 3. Testavimas
- E2E testas per Playwright mobile viewport: org prisijungia → onboarding pasirodo → sukuriama pirmoji užduotis → pereinama į dashboard.
- Performance smoke test: `bun run build` nesugenda, JS chunk sizes < 500KB initial.
- Mobile audit: 360px wide screenshot — nėra horizontal scroll, visi mygtukai paspaudžiami.

## 4. Failai, kuriuos keisime
- `vite.config.ts` — chunking / build optimizacija.
- `src/styles.css` — mobile touch/scroll utility, jei reikia.
- `src/components/mobile-tab-bar.tsx` — mobile UX fixes.
- `src/components/onboarding-tour.tsx` — galbūt bendros animacijos.
- `src/routes/organization.tsx` — lazy analytics, maybe lighter imports.
- Naujas: `src/routes/organization.welcome.tsx` — onboarding wizard.
- Naujas arba atnaujintas: `src/lib/org-onboarding.functions.ts` — server fns užduočiai iš onboarding.
- `src/routes/__root.tsx` / `src/routes/index.tsx` — preload, meta optimizacija.

## 5. Nekeičiame
- Auth flow, RLS, DB schema, esminių business rules.
- Admin srities funkcionalumas.
- Dabartinės rezervacijos / chat logikos.
