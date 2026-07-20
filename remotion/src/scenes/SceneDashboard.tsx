import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { AmbientBg, NavBar, COLORS, interp } from "../ui/primitives";

export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const greetIn = spring({ frame, fps, config: { damping: 20 } });
  const actionsIn = spring({ frame: frame - 20, fps, config: { damping: 22 } });
  const goalCardIn = spring({ frame: frame - 34, fps, config: { damping: 18 } });
  const visitCardIn = spring({ frame: frame - 44, fps, config: { damping: 18 } });

  // progress ring 0 → 20%
  const progress = interp(frame, [50, 130], [0, 20]) / 100;
  const R = 78;
  const C = 2 * Math.PI * R;

  // counting numbers
  const doneH = Math.round(interp(frame, [80, 140], [0, 4]));
  const leftH = Math.round(interp(frame, [90, 150], [20, 16]));
  const activeR = 0;
  const orgs = 0;

  // stat cards stagger
  const stat = (d: number) => spring({ frame: frame - d, fps, config: { damping: 18 } });

  // weekly bars
  const weekly = [3, 5, 2, 6, 4, 7, 3, 5];
  const barMax = 8;

  // camera drift
  const drift = interp(frame, [0, 450], [0, -40]);

  const outO = interp(frame, [420, 450], [1, 0]);
  return (
    <AbsoluteFill style={{ opacity: outO }}>
      <AmbientBg />
      <NavBar active="dash" user />

      <div style={{ position: "absolute", top: 130 + drift, left: 100, right: 100 }}>
        <div style={{ color: COLORS.cyan, letterSpacing: 2, fontSize: 14, fontWeight: 700, opacity: greetIn }}>MOKINIO SRITIS</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 8,
            opacity: greetIn,
            transform: `translateY(${(1 - greetIn) * 15}px)`,
          }}
        >
          <div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 68, color: "#fff", letterSpacing: -1 }}>
              Sveika, Lukas Stankevičius 
            </div>
            <div style={{ color: COLORS.muted, marginTop: 6, fontSize: 15 }}>lukas.stankevicius@dev.local</div>
          </div>
          <div style={{ display: "flex", gap: 12, opacity: actionsIn }}>
            {["✦ Pasiūlyk rezervaciją", `PDF sertifikatas (${doneH}/20 val.)`, "+ Naršyti užduotis"].map((b, i) => (
              <div
                key={b}
                style={{
                  padding: "12px 20px",
                  borderRadius: 999,
                  background: i === 2 ? "linear-gradient(135deg, #67e8f9, #22b8d4)" : COLORS.panel,
                  color: i === 2 ? "#0a0d1c" : "#c9d3e6",
                  fontWeight: 600,
                  fontSize: 14,
                  border: i === 2 ? "none" : `1px solid ${COLORS.border}`,
                }}
              >
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* Goal + Visits row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginTop: 30 }}>
          {/* Goal card */}
          <div
            style={{
              padding: 32,
              borderRadius: 24,
              background: "linear-gradient(180deg, rgba(19,26,46,0.9), rgba(15,20,36,0.95))",
              border: `1px solid ${COLORS.border}`,
              opacity: goalCardIn,
              transform: `translateY(${(1 - goalCardIn) * 25}px)`,
              display: "flex",
              alignItems: "center",
              gap: 30,
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ position: "relative", width: 180, height: 180 }}>
              <svg width={180} height={180} viewBox="0 0 180 180">
                <circle cx={90} cy={90} r={R} stroke="rgba(148,163,184,0.15)" strokeWidth={12} fill="none" />
                <circle
                  cx={90}
                  cy={90}
                  r={R}
                  stroke="url(#gradR)"
                  strokeWidth={12}
                  fill="none"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - progress)}
                  strokeLinecap="round"
                  transform="rotate(-90 90 90)"
                />
                <defs>
                  <linearGradient id="gradR" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#67e8f9" />
                    <stop offset="100%" stopColor="#22b8d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, color: "#fff" }}>{Math.round(progress * 100)}%</div>
                <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontWeight: 600 }}>PROGRESAS</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.cyan, letterSpacing: 2, fontSize: 12, fontWeight: 700 }}>METINIS TIKSLAS</div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 56, color: "#fff", marginTop: 4 }}>
                {doneH} / 20 val.
              </div>
              <div style={{ color: COLORS.muted, fontSize: 15, marginTop: 6 }}>Liko {leftH} val. iki tikslo.</div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                {[
                  { t: "0 sav. iš eilės", c: COLORS.orange },
                  { t: `Vid. ${(doneH / 8).toFixed(1)} val./vizitui`, c: COLORS.cyan },
                  { t: `${doneH} užbaigti vizitai`, c: COLORS.green },
                ].map((c) => (
                  <div key={c.t} style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${c.c}`, color: c.c, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.02)" }}>
                    {c.t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Next visit card */}
          <div
            style={{
              padding: 32,
              borderRadius: 24,
              background: "linear-gradient(180deg, rgba(19,26,46,0.9), rgba(15,20,36,0.95))",
              border: `1px solid ${COLORS.border}`,
              opacity: visitCardIn,
              transform: `translateY(${(1 - visitCardIn) * 25}px)`,
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ color: COLORS.cyan, letterSpacing: 2, fontSize: 12, fontWeight: 700 }}>KITAS VIZITAS</div>
            <div
              style={{
                marginTop: 16,
                padding: 30,
                borderRadius: 16,
                border: `1px dashed ${COLORS.borderStrong}`,
                textAlign: "center",
                color: COLORS.muted,
                fontSize: 15,
                minHeight: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Nėra suplanuotų vizitų. <span style={{ color: COLORS.cyan, marginLeft: 6, fontWeight: 600 }}>Rink užduotį</span>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginTop: 22 }}>
          {[
            { icon: "◷", val: doneH, label: "Užbaigtos valandos", sub: "iš 20 reikalingų", d: 60 },
            { icon: "◉", val: leftH, label: "Liko valandų", sub: `${Math.round(progress * 100)}% iki tikslo`, d: 72 },
            { icon: "▢", val: activeR, label: "Aktyvios rezervacijos", sub: "—", d: 84 },
            { icon: "▤", val: orgs, label: "Organizacijos", sub: "kur savanoriavai", d: 96 },
          ].map((c) => {
            const s = stat(c.d);
            const float = Math.sin(frame / 20 + c.d) * 3;
            return (
              <div
                key={c.label}
                style={{
                  padding: 24,
                  borderRadius: 20,
                  background: "linear-gradient(180deg, rgba(19,26,46,0.9), rgba(15,20,36,0.95))",
                  border: `1px solid ${COLORS.border}`,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 25 + float}px)`,
                  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 999, background: COLORS.cyanSoft, color: COLORS.cyan, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{c.icon}</div>
                  <div style={{ color: COLORS.green, fontSize: 20 }}>↗</div>
                </div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 44, color: "#fff", marginTop: 14 }}>{c.val}</div>
                <div style={{ color: "#c9d3e6", fontSize: 14, fontWeight: 600, marginTop: 4 }}>{c.label}</div>
                <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{c.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Weekly chart */}
        <div
          style={{
            marginTop: 24,
            padding: 30,
            borderRadius: 24,
            background: "linear-gradient(180deg, rgba(19,26,46,0.9), rgba(15,20,36,0.95))",
            border: `1px solid ${COLORS.border}`,
            opacity: spring({ frame: frame - 110, fps, config: { damping: 22 } }),
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: "#fff" }}>Savaitinis aktyvumas</div>
            <div style={{ padding: "6px 14px", borderRadius: 999, background: COLORS.cyanSoft, color: COLORS.cyan, fontSize: 13, fontWeight: 600 }}>{weekly.reduce((a, b) => a + b, 0)} val. iš viso</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 22, height: 140 }}>
            {weekly.map((v, i) => {
              const grow = interp(frame, [140 + i * 4, 200 + i * 4], [0, v / barMax]);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ color: "#c9d3e6", fontSize: 11, fontWeight: 600 }}>{v}</div>
                  <div
                    style={{
                      width: "100%",
                      height: `${grow * 100}%`,
                      background: `linear-gradient(180deg, #67e8f9, #22b8d4)`,
                      borderRadius: 8,
                      boxShadow: "0 8px 20px rgba(103,232,249,0.25)",
                    }}
                  />
                  <div style={{ color: COLORS.muted, fontSize: 11 }}>S{i + 1}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
