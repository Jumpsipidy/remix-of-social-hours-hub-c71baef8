import { motion } from "framer-motion";
import { Check, MapPin, Clock, QrCode, Send, MousePointer2 } from "lucide-react";

/** Mažos „gyvos“ demonstracijos onboarding'ui — rodo, o ne pasakoja. */
export type DemoKind = "tasks" | "reserve" | "hours" | "cert" | "post" | "approve" | "chat" | "students" | "risk";

const loop = { repeat: Infinity, repeatDelay: 1.2 } as const;

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="relative mt-5 h-44 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3">{children}</div>;
}

function Pointer({ x, y, delay = 0.8 }: { x: number[]; y: number[]; delay?: number }) {
  return (
    <motion.span className="pointer-events-none absolute z-10 text-white" initial={{ left: x[0], top: y[0], opacity: 0 }}
      animate={{ left: x, top: y, opacity: [0, 1, 1, 0], scale: [1, 1, 0.85, 1] }} transition={{ duration: 2.2, delay, ...loop }}>
      <MousePointer2 className="h-5 w-5 fill-white" />
    </motion.span>
  );
}

export function OnboardingDemo({ kind }: { kind: DemoKind }) {
  if (kind === "tasks") return (
    <Frame>
      {["Maisto bankas", "Bibliotekos šventė", "Parko tvarkymas"].map((t, i) => (
        <motion.div key={t} className="mb-2 flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2.5"
          animate={i === 1 ? { backgroundColor: ["rgba(255,255,255,.06)", "rgba(255,255,255,.06)", "rgba(59,130,246,.35)", "rgba(255,255,255,.06)"] } : {}}
          transition={{ duration: 2.2, delay: 0.8, ...loop }}>
          <div><p className="text-sm font-semibold text-white">{t}</p><p className="flex items-center gap-1 text-[11px] text-white/50"><MapPin className="h-3 w-3" />{["Šeduva", "Radviliškis", "Šiauliai"][i]}</p></div>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/80">{i + 2} val.</span>
        </motion.div>
      ))}
      <Pointer x={[260, 200, 180, 260]} y={[150, 80, 70, 150]} />
    </Frame>
  );
  if (kind === "reserve") return (
    <Frame>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 14 }).map((_, d) => (
          <motion.div key={d} className="grid h-8 place-items-center rounded-lg bg-white/[0.06] text-xs text-white/70"
            animate={d === 9 ? { backgroundColor: ["rgba(255,255,255,.06)", "rgba(59,130,246,.9)", "rgba(59,130,246,.9)"] } : {}}
            transition={{ duration: 2.4, times: [0, 0.35, 1], delay: 0.6, ...loop }}>{d + 1}</motion.div>
        ))}
      </div>
      <motion.div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-200"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: [0, 0, 1, 1], y: [8, 8, 0, 0] }} transition={{ duration: 2.4, times: [0, 0.45, 0.6, 1], delay: 0.6, ...loop }}>
        <Check className="h-4 w-4" /> Rezervuota · 10 d. 14:00
      </motion.div>
    </Frame>
  );
  if (kind === "hours") return (
    <Frame>
      <p className="text-xs text-white/50">Tavo valandos</p>
      <motion.p className="font-display text-4xl font-bold tabular-nums text-white" animate={{ opacity: [0.6, 1] }}>14 / 20</motion.p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full rounded-full bg-emerald-400" animate={{ width: ["40%", "70%"] }} transition={{ duration: 1.4, delay: 0.6, ...loop }} />
      </div>
      <motion.p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-200" animate={{ opacity: [0, 1] }} transition={{ delay: 1.6, duration: 0.3, ...loop, repeatDelay: 2.3 }}>
        <Check className="h-4 w-4" /> +6 val. patvirtinta
      </motion.p>
    </Frame>
  );
  if (kind === "cert") return (
    <Frame>
      <motion.div className="mx-auto flex w-56 items-center gap-3 rounded-xl bg-white p-3 text-slate-900" animate={{ rotate: [-2, 0, -2] }} transition={{ duration: 4, repeat: Infinity }}>
        <QrCode className="h-14 w-14" />
        <div><p className="text-[10px] font-semibold uppercase text-slate-500">Pažymėjimas</p><p className="text-sm font-bold">20 / 20 val.</p><p className="text-[10px] text-emerald-700">✓ Patikrintas</p></div>
      </motion.div>
      <p className="mt-4 text-center text-xs text-white/55">Nuskenavus QR — patvirtinimas per sekundę</p>
    </Frame>
  );
  if (kind === "post") return (
    <Frame>
      {["Pavadinimas", "Data ir laikas", "Miestas"].map((l, i) => (
        <div key={l} className="mb-2 rounded-lg bg-white/[0.06] px-3 py-2">
          <p className="text-[10px] text-white/45">{l}</p>
          <motion.p className="overflow-hidden whitespace-nowrap text-sm text-white" initial={{ width: 0 }} animate={{ width: ["0%", "100%"] }} transition={{ duration: 0.7, delay: 0.4 + i * 0.6, ...loop, repeatDelay: 2.4 }}>
            {["Parko tvarkymas", "Šešt., 10:00–13:00", "Šeduva"][i]}
          </motion.p>
        </div>
      ))}
    </Frame>
  );
  if (kind === "approve") return (
    <Frame>
      {["Ona K. · 10b", "Jonas P. · 9a", "Lukas M. · 11c"].map((n, i) => (
        <div key={n} className="mb-2 flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2.5">
          <span className="text-sm text-white">{n}</span>
          <motion.span className="grid h-7 w-7 place-items-center rounded-full border border-white/20 text-emerald-300"
            animate={{ backgroundColor: ["rgba(0,0,0,0)", "rgba(16,185,129,.3)"] }} transition={{ delay: 0.6 + i * 0.5, duration: 0.3, ...loop, repeatDelay: 2.4 }}>
            <Check className="h-4 w-4" />
          </motion.span>
        </div>
      ))}
    </Frame>
  );
  if (kind === "chat") return (
    <Frame>
      {[{ m: "Laba, ar dar yra vietų šeštadieniui?", me: true }, { m: "Taip! Lauksime 10:00 prie įėjimo.", me: false }].map((x, i) => (
        <motion.div key={i} className={`mb-2 max-w-[80%] rounded-2xl px-3 py-2 text-sm ${x.me ? "ml-auto bg-blue-500 text-white" : "bg-white/10 text-white"}`}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0, 1], y: [6, 0] }} transition={{ delay: 0.4 + i * 1, duration: 0.3, ...loop, repeatDelay: 2.4 }}>
          {x.m}
        </motion.div>
      ))}
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-white/40">Rašyk žinutę… <Send className="ml-auto h-3.5 w-3.5" /></div>
    </Frame>
  );
  if (kind === "students") return (
    <Frame>
      {[["10a", 85], ["10b", 52], ["11a", 30]].map(([c, p], i) => (
        <div key={c} className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-white/70"><span>{c} klasė</span><span className="tabular-nums">{p}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-blue-400" initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ delay: 0.3 + i * 0.2, duration: 0.8 }} /></div>
        </div>
      ))}
      <p className="flex items-center gap-1 text-[11px] text-white/45"><Clock className="h-3 w-3" /> Atnaujinama realiu laiku</p>
    </Frame>
  );
  return (
    <Frame>
      {[["Aukšta", "bg-red-500/25 text-red-200"], ["Vidutinė", "bg-amber-500/25 text-amber-200"]].map(([l, c], i) => (
        <motion.div key={l} className="mb-2 flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2.5" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.3 }}>
          <span className="text-sm text-white">{i ? "Jonas P." : "Ona K."}</span><span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${c}`}>{l}</span>
        </motion.div>
      ))}
      <p className="mt-2 text-xs text-white/50">Paspausk mokinį → visa istorija</p>
    </Frame>
  );
}
