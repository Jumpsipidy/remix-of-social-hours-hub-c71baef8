# Google Analytics — Paprastas gidas 🎯

## TL;DR (labai trumpai)

- **G-XXX kodas jau įdėtas** į `src/routes/__root.tsx`. Nieko dėti į Vercel nereikia.
- Dabartinis kodas: `G-4HRBLS0E3G`.
- Kai deploy'insi į Vercel — GA pradės rinkti duomenis automatiškai.

Tai viskas. Toliau — tik jei nori pakeisti domeną arba pridėti daugiau.

---

## 1. Kur yra G-XXX kodas?

Failas: **`src/routes/__root.tsx`**

Ten yra du script'ai:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-4HRBLS0E3G"></script>
<script>gtag('config', 'G-4HRBLS0E3G');</script>
```

Nori pakeisti į kitą ID? Tiesiog **replace** `G-4HRBLS0E3G` į savo naują ID toje pačioje vietoje. Viskas.

---

## 2. „Kodėl domenas `jumpsipidy.online`, o ne `socialinesvalandos.dev`?"

**Trumpai:** niekur mano kode `jumpsipidy.online` nėra nustatytas kaip domenas. Jei matai jį GA — tai reiškia, kad **Google Analytics property'ėje** (analytics.google.com) buvo įrašytas tas domenas kaip „website URL".

### Kaip pataisyti Google Analytics pusėje:
1. Eik į [analytics.google.com](https://analytics.google.com)
2. Admin (apačioje kairėj, krumpliaratis ⚙️)
3. **Data Streams** → paspausk savo stream'ą
4. Matysi „Stream URL" — ten pakeisk į:
   - `https://socialinesvalandos.dev` (jei naudoji Vercel default)
   - arba tavo custom domain (pvz. `https://socialinesvalandos.lt`)
5. Save.

**Svarbu:** GA vis tiek rinks duomenis iš BET KURIO domeno, kur įdėtas `G-XXX` kodas. Stream URL yra tik „nominali" nuoroda ataskaitose — ne filtras.

---

## 3. „Ar reikia ką nors dėti į Vercel?"

**NE.** Vercel'yje nieko nedaryk dėl Google Analytics. Kodas jau HTML head'e, ir kai deploy'insi — GA automatiškai suveiks.

Vienintelis dalykas Vercel'yje reikalingas — Supabase env kintamieji (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), bet tai ne GA temai.

---

## 4. Kaip patikrinti ar GA veikia?

1. Deploy'ink į Vercel.
2. Atidaryk savo svetainę naršyklėje.
3. Eik į [analytics.google.com](https://analytics.google.com) → **Reports → Realtime**.
4. Turi matyti savo apsilankymą per ~30 sek.

Jei nematai:
- Patikrink DevTools → Network tab → ar užsikrauna `gtag/js?id=G-4HRBLS0E3G`.
- Ad blocker'iai blokuoja GA — išjunk arba testuok incognito.

---

## 5. Turiu savo Analytics puslapį `/admin/analytics` — kam GA?

Tavo vidinis analytics (`/admin/analytics`) rodo **savo duomenis** (rezervacijos, vartotojai, aktyvumas iš tavo Supabase). Google Analytics rodo **web traffic** duomenis (iš kur žmonės atėjo, kokie įrenginiai, kiek laiko praleido).

Abu naudingi. Neblokuoja vienas kito.

---

## 6. Nenoriu Google Analytics — kaip išjungti?

Ištrink šias eilutes iš `src/routes/__root.tsx` `scripts` array'aus:
- `src="https://www.googletagmanager.com/gtag/js..."`
- inline script'ą su `gtag('config', ...)`.

Deploy'ink. Baigta.

---

## Dažni klausimai

**Q: Ar reikia mokėti už Google Analytics?**
A: Ne. GA4 nemokamas iki 10M event'ų per mėnesį.

**Q: Ar GA veikia lokaliai (`localhost:8080`)?**
A: Techniškai taip, bet Realtime nerodys — GA filtruoja localhost. Testuok deploy'intoje versijoje.

**Q: Kur gauti G-XXX kodą jei kuriu naują property?**
A: analytics.google.com → Admin → Data Streams → Add Stream → Web → įvedi URL → gauni `G-XXXXXXXXXX`.

---

Viskas. Jei kas neaišku — pasakyk konkrečiai kur užstrigai.
