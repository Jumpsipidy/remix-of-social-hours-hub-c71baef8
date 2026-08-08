---
name: Email Infrastructure & Support
description: Outlines the email delivery system, domains, and response protocols.
type: feature
---

# El. pašto infrastruktūra ir palaikymas

## Siuntimo logika
Visi automatiniai sistemos laiškai siunčiami per **Resend** infrastruktūrą naudojant patikimą techninį domeną:
- **Siuntėjas (From):** `Socialinės Valandos <noreply@jumpsipidy.online>`
- **Techninis pagrindimas:** `noreply@jumpsipidy.online` naudojamas Resend verifikacijai ir aukštam pristatomumui (deliverability) užtikrinti. Vartotojai mato vardą „Socialinės Valandos“.

## Palaikymas ir atsakymai
Nors laiškai siunčiami iš `noreply`, visi pagalbos ir atgalinio ryšio kanalai nukreipti į oficialų pagalbos el. paštą:
- **Pagalbos el. paštas:** `pagalba@socialinesvalandos.lt`
- **Reply-To:** Visų laiškų `Reply-To` antraštė nustatyta į `pagalba@socialinesvalandos.lt`. Jei organizacija ar mokinys tiesiog paspaus „Atsakyti“ (Reply) savo pašto programoje, laiškas nukeliaus tiesiai į pagalbą.

## Klaidų pranešimai (Alerts)
Administratorių gaunami kritinių klaidų pranešimai siunčiami iš:
- `Socialinės Valandos Alerts <alerts@jumpsipidy.online>`
- **Reply-To:** `noreply@jumpsipidy.online` (atsakymai nepriimami).

## Organizacijų kvietimo srautas
1. Super Admin įveda el. paštą skydelyje `/admin/tools`.
2. Išsiunčiamas firminis HTML laiškas su kvietimu.
3. Jei organizacija turi klausimų ir atsako į laišką, jis pasiekia administratorių per `pagalba@socialinesvalandos.lt`.
