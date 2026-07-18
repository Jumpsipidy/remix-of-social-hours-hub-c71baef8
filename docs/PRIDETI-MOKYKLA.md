# Kaip pridėti naują mokyklą

Kiekviena mokykla saugoma `schools` lentelėje. Kiekviena mokykla turi savo unikalų `signup_code` — mokiniai turi jį įvesti, kad prisiregistruotų prie tos mokyklos.

## 1 būdas — per Super Admin skydelį (rekomenduojama)

1. Prisijunk kaip super admin.
2. Eik į **Sistemos administracija → Mokyklos** (`/admin/schools`).
3. Spausk **„Pridėti mokyklą“**.
4. Užpildyk:
   - **Pavadinimas** — pvz. `Vilniaus Licėjus`
   - **Miestas** — pvz. `Vilnius`
   - **Registracijos kodas** — pvz. `LICEJUS2026` (didžiosios raidės, be tarpų)
   - **Aktyvi** — palik įjungtą.
5. Išsaugok. Mokykla iškart matoma registracijos formoje ir mokiniai gali registruotis su tuo kodu.

## 2 būdas — SQL (jeigu skydelis neveikia)

```sql
INSERT INTO public.schools (name, city, signup_code, is_active)
VALUES ('Vilniaus Licėjus', 'Vilnius', 'LICEJUS2026', true);
```

## Ką patikrinti po sukūrimo

- Registracijos puslapyje (`/register`) atsiranda naujas variantas išskleidžiamame sąraše.
- Mokinys turi pasirinkti tą mokyklą **ir** įvesti kodą, kitaip registracija atmesta.
- Kodas rodomas **tik** super admin skydelyje — mokiniai jo niekur nemato.

Rekomenduojama kodo forma: `MOKYKLA + METAI`, be lietuviškų raidžių.