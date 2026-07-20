import { renderShell, metaGrid, APP_URL, escape } from "./_shell";

type Props = {
  fullName: string;
  role: "student" | "organization" | "school_admin" | "admin";
  hoursNeeded?: number;
};

const ROLE_COPY: Record<Props["role"], { eyebrow: string; heading: (n: string) => string; body: (n: number) => string; cta: string; href: string }> = {
  student: {
    eyebrow: "Sveikas atvykęs",
    heading: (n) => `Labas, ${n}! 👋`,
    body: (h) =>
      `Tavo mokinio paskyra sukurta. Tavo tikslas: <b style="color:#e2e8f0;">${h} val.</b> socialinės-pilietinės veiklos.<br/><br/>
       Naršyk užduotis, rezervuokis, atlik darbą — organizacija patvirtins ir valandos automatiškai įsiskaitys.`,
    cta: "Rasti pirmą užduotį",
    href: `${APP_URL}/tasks`,
  },
  organization: {
    eyebrow: "Sveikas atvykęs · Organizacija",
    heading: (n) => `Sveikas, ${n}! 🎯`,
    body: () =>
      `Tavo organizacijos paskyra sukurta. Kurkite užduotis, kvieskite savanorius, tvirtinkite valandas.<br/><br/>
       Pirmą darbą siūlome pradėti nuo pilno profilio užpildymo — tai padidina savanorių pasitikėjimą x3.`,
    cta: "Kurti pirmą užduotį",
    href: `${APP_URL}/organization`,
  },
  school_admin: {
    eyebrow: "Sveikas atvykęs · Mokyklos administratorius",
    heading: (n) => `Sveikas, ${n}! 🏫`,
    body: () =>
      `Tavo mokyklos administratoriaus paskyra sukurta. Gali stebėti savo klasės mokinių pažangą, patvirtinti veiklas ir generuoti ataskaitas.`,
    cta: "Atidaryti panelę",
    href: `${APP_URL}/school`,
  },
  admin: {
    eyebrow: "Super admin",
    heading: (n) => `Sveikas, ${n}! 👑`,
    body: () => `Super admin paskyra aktyvuota. Turi pilną platformos valdymą.`,
    cta: "Atidaryti admin",
    href: `${APP_URL}/admin`,
  },
};

export function renderWelcomeEmail(p: Props): string {
  const c = ROLE_COPY[p.role];
  const meta =
    p.role === "student" && p.hoursNeeded
      ? metaGrid([
          { label: "Tavo tikslas", value: `${p.hoursNeeded} val.` },
          { label: "Statusas", value: "Aktyvi" },
        ])
      : "";

  return renderShell({
    title: "Sveikas atvykęs",
    preview: c.body(p.hoursNeeded ?? 0).replace(/<[^>]+>/g, "").slice(0, 90),
    accent: "emerald",
    eyebrow: c.eyebrow,
    medallionEmoji: "✦",
    heading: c.heading(escape(p.fullName)),
    bodyHtml: c.body(p.hoursNeeded ?? 20),
    extraBlocksHtml: meta,
    ctaLabel: c.cta,
    ctaHref: c.href,
  });
}

export function welcomeText(p: Props): string {
  const c = ROLE_COPY[p.role];
  return `Sveikas, ${p.fullName}!\n\nTavo Socialinės Valandos paskyra sukurta.\n${p.role === "student" && p.hoursNeeded ? `Tikslas: ${p.hoursNeeded} val.\n` : ""}\n${c.cta}: ${c.href}`;
}
