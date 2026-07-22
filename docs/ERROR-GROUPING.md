# 🧠 Klaidų grupavimas ir Fingerprintai — pilnas gidas

> **Trumpai:** Užuot rodę tūkstantį vienodų klaidų, sistema jas suglaudžia į vieną **„grupę"** su unikaliu `#fingerprint` ID. Vietoje sąrašo „1000 klaidų" matai „7 grupes" — daug lengviau suprasti, kas tikrai lūžta.
>
> Viskas veikia automatiškai. Jokių SQL migracijų nereikia — fingerprintai saugomi `activity_log.meta` JSON stulpelyje, kuris jau egzistuoja.

---

## 1. Kodėl to reikia

Anksčiau `/admin/errors` puslapyje matydavai **kiekvieną klaidą atskirai**:

```
[JS] TypeError: Cannot read properties of null (reading 'id')  · user_id=aaa
[JS] TypeError: Cannot read properties of null (reading 'id')  · user_id=bbb
[JS] TypeError: Cannot read properties of null (reading 'id')  · user_id=ccc
... (dar 47 tokių)
```

Problema: **tai ta pati klaida**, bet atrodo kaip 50 skirtingų. Sunku suprasti kas svarbiausia.

Dabar tas pats sąrašas atrodo taip:

```
🔴 #a3f9c2b  Severity 87  🆕 nauja
   TypeError: Cannot read properties of null (reading 'id')
   ↳ src/routes/student.tsx:142
   50× įvykių · 23 vartotojų · 4 puslapių · 3 naršyklių · 12 kritinių
   [24h trend sparkline: ▁▁▂▃▅▇███▇▅▃]
```

Vienas žvilgsnis → viską matai.

---

## 2. Kas yra „fingerprint"?

**Fingerprint** = 7 simbolių unikalus ID, atspindintis **klaidos rūšį**, o ne konkretų įvykį.

Dvi klaidos gauna tą patį fingerprintą, jeigu:
- Turi tą pačią **žinutę** (normalizuotą — pašalinti UUID, skaičiai, URL parametrai)
- Kilo toje pačioje **stack trace vietoje** (pirmas kadras, be eilutės numerių)

### Pavyzdys — kaip normalizuojama:

| Originali žinutė | Normalizuota | Fingerprint |
|---|---|---|
| `Cannot find user 4f8a-...-c2b1` | `Cannot find user <uuid>` | `#a3f9c2b` |
| `Cannot find user 9df3-...-ab77` | `Cannot find user <uuid>` | `#a3f9c2b` ← ta pati |
| `Failed to fetch /api/tasks/42` | `Failed to fetch <url>` | `#b7e1904` |
| `Failed to fetch /api/tasks/999` | `Failed to fetch <url>` | `#b7e1904` ← ta pati |
| `Timeout after 3000ms` | `Timeout after <n>ms` | `#c2d8517` |

**Normalizavimo taisyklės** (žr. `src/lib/error-fingerprint.ts`):
- UUID → `<uuid>`
- Skaičiai (≥3 skaitmenys) → `<n>`
- URL keliai `/foo/bar/123` → `<url>`
- Query parametrai `?x=1&y=2` → `<qs>`
- Failų keliai su eilutės numeriais → `<file>`
- Ilgi hash'ai (>16 simb. hex) → `<hash>`

Tada normalizuota žinutė + pirmas stack kadras hash'inami į 7-simbolių Base36 ID.

---

## 3. Severity skaičiavimas — kaip 0–100

Kiekviena grupė gauna **Severity balą (0–100)**, pagal kurį rikiuojasi sąrašas ir spalvinasi kortelė:

| Faktorius | Svoris | Paaiškinimas |
|---|---|---|
| Vartotojų skaičius | ×15 | Kiek unikalių žmonių pataikė |
| Puslapių skaičius | ×5 | Kiek skirtingų maršrutų |
| Kritiniai įvykiai | ×10 | `error.escalation`, `error.burst`, `lockdown.*` |
| Bendras kiekis | log × 8 | Logaritminis — 100 vs 10 nedaug skiriasi |
| Šviežumas | ×20 (≤1h), ×10 (≤24h) | Nauji lūžiai svarbesni |

Bal patampomas į `[0..100]`.

### Kortelės spalvos
- 🟢 **0–39** — žalias/žydras: retai pasitaiko, žemas prioritetas
- 🟡 **40–69** — geltonas/oranžinis: verta pažiūrėti
- 🔴 **70–100** — raudonas/purpurinis: **fix now**

---

## 4. Kas rodoma kortelėje

Kiekviena grupė `/admin/errors` → **„Top"** skiltyje rodo:

| Elementas | Ką reiškia |
|---|---|
| `#a3f9c2b` | Unikalus fingerprint ID (spausk → nukopijuoji į clipboard) |
| `[JS]` `[ESCALATED]` `[BURST]` | Klaidos tipas |
| **🆕 nauja** | Pirmas įvykis buvo per pastarąsias 24h |
| **Severity 87** | Prioriteto balas |
| „pirmas: 3h · paskutinis: 2m" | Reliatyvūs laikai |
| **50× įvykių** | Bendras kiekis |
| **23 vartotojų** | Unikalių `user_id` skaičius |
| **4 puslapių** | Skirtingi maršrutai kur nutinka |
| **3 naršyklių** | Chrome/Safari/Firefox breakdown |
| **12 kritinių** | Kiek iš jų buvo `error.escalation` tipo |
| **24h sparkline** | 24 stulpeliai (po 1h) — matai bangas |
| ↳ `src/routes/x.tsx:42` | Pirmas stack kadras (kur lūžta) |

### Veiksmai kortelėje:
- **Detalės** — atidaro pilną klaidos modalą su stack trace + session replay
- **Live filtras** — perkelia į „Live" skiltį su filtru pagal šį fingerprintą
- **Nutildyti** — paslepia grupę (išsaugoma `localStorage`, atkurti galima)
- **Copy #fp** — nukopijuoja ID į pokalbį/GitHub issue

---

## 5. Rikiavimo ir filtravimo varikliai

Viršuje „Top" skilties yra rikiavimo mygtukai:

- **Severity** — pagal apskaičiuotą balą (numatytasis)
- **Kiekis** — pagal grubų įvykių skaičių
- **Vartotojai** — pagal unikalių paveiktų vartotojų skaičių
- **Naujausia** — pagal paskutinį įvykį

Ir jungiklis **🆕 Tik nauja (24h)** — rodyti tik grupes, atsiradusias pastarąsias 24 valandas. Idealu užklupti regresijas po deployment'o.

---

## 6. Integracija su likusiu Error Center

Fingerprintai automatiškai:

1. **Įsirašo į `activity_log.meta`** — laukai `fingerprint`, `fingerprint_norm`, `fingerprint_frame`. Nereikia migracijos, nes tai JSON.
2. **Rodomi „Live" skiltyje** kaip `#a3f9c2b` chip'as prie kiekvienos eilutės.
3. **Įtraukiami į eksportą** (copy-to-clipboard) — kai siunti klaidą pokalbyje, iškart matai `#fp` ID.
4. **Naudojami paieškoje** — įrašyk `#a3f9c2b` filtre → matai visus tos grupės įvykius.
5. **Naudojami emailų digest'e** (`error-escalation.functions.ts`) — kritinės grupės rikiuojamos pagal fingerprintą, kad emails'ai nebūtų 100 kartų su ta pačia klaida.

---

## 7. Overlay Bridge — kai Lovable/Vite parodo savo overlay'ų

Kartais lūžta taip, kad **Vite** (dev serveris) arba **Lovable** overlay užsideda ant ekrano su raudonu langu. Tie overlay'ai anksčiau **neįsirašydavo į mūsų klaidų log'ą** — matydavai overlay, bet `/admin/errors` buvo tuščias.

Dabar `LovableOverlayBridge` (`src/components/lovable-overlay-bridge.tsx`) tai pagauna:

- Nuolat stebi `vite-error-overlay` ir `[data-lovable-error-overlay]` elementus DOM'e
- Automatiškai perkelia klaidos tekstą + stack į mūsų `error-log.ts`
- Prideda mygtuką **„Siųsti adminams"** pačiame overlay'uje

Jei overlay atsiranda **be** teksto (kartais taip nutinka), rankinis mygtukas leidžia bent pažymėti, kad kažkas įvyko.

---

## 8. Auto-recovery ir Burst detekcija

Grupavimas veikia kartu su:

- **Burst detekcija** (`error-escalation.functions.ts`) — jei ≥3 skirtingi vartotojai per 90s pataiko į **tą patį fingerprintą**, sistema iškart siunčia email + įjungia lockdown'ą. Anksčiau reikėjo 3 identiškų žinučių — dabar užtenka „iš esmės tos pačios" klaidos.
- **Auto-recovery** (`lockdown-recovery.functions.ts`) — po lockdown'o, jei 10 minučių nėra naujų kritinių grupių, sistema pati atsirakina.
- **Admin HUD** (`admin-error-hud.tsx`) — plaukiojantis widgetas rodo grupių skaičių, pulsuoja kai atsiranda nauja.

---

## 9. Kaip patikrinti, ar veikia

1. Eik į `/admin/errors` → **„Top"** skiltis.
2. Turėtum matyti grupes (arba tuščią būseną „Grupių nėra — sistema švari").
3. Paspausk **Severity** → **Kiekis** → **Vartotojai** — sąrašas persirikiuoja.
4. Paspausk „🆕 Tik nauja" — pasilieka tik grupės iš pastarųjų 24h.
5. Paspausk „Nutildyti" ant grupės — dingsta iš sąrašo, atsiranda „Nutildyta (1)" sekcijoje.
6. „Live" skiltyje kiekvienoje eilutėje turėtum matyti `#xxxxxxx` chip'ą.
7. Įrašyk fingerprintą į paieškos lauką — turi filtruotis tik tos grupės eilutės.
8. Iššauk klaidą (pvz. atidaryk konsolę ir `throw new Error("test-fp-check")`) → per 5s ji turi atsirasti kaip nauja grupė.

---

## 10. Ką **NEreikia** daryti

- ❌ **Jokios SQL migracijos** — `activity_log.meta` yra `jsonb`, viską priima.
- ❌ **Jokių naujų secretų** — viskas skaičiuojasi kliento pusėje.
- ❌ **Jokių trečių šalių paslaugų** (Sentry, etc.) — pilnai savarankiška.
- ❌ **Nekeisti** `error-fingerprint.ts` normalizavimo taisyklių be reikalo — pakeitus, seni fingerprintai nesutaps su naujais ir grupės „suskils".

---

## 11. Failai kurie viską daro

| Failas | Ką daro |
|---|---|
| `src/lib/error-fingerprint.ts` | Normalizavimas + fingerprint + severity skaičiavimas |
| `src/lib/error-log.ts` | Prideda `fingerprint` į kiekvieną loginamą klaidą |
| `src/components/lovable-overlay-bridge.tsx` | Pagauna Vite/Lovable overlay'us |
| `src/routes/admin.errors.tsx` | Rodo grupes su severity, trend, actions |
| `src/lib/error-escalation.functions.ts` | Burst pagal fingerprintą + email digest |
| `src/lib/lockdown-recovery.functions.ts` | Auto-atrakinimas kai tylu 10min |
| `src/components/admin-error-hud.tsx` | Plaukiojantis realtime skaitiklis |

**Viskas.** Sistema pilnai advanced ir pilnai autonominė.
