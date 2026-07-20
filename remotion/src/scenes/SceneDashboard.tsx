import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, NavBar } from "../ui/primitives";

// Student dashboard — recreated from file-23.
const StatCard: React.FC<{
  delay: number; icon: string; end: number; label: string; sub: string; color: string;
}> = ({ delay, icon, end, label, sub, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 110 } });
  const n = Math.round(interpolate(frame - delay - 6, [0, 50], [0, end], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{
      opacity: s, transform: `translateY(${(1 - s) * 20}px)`,
      background: "linear-gradient(180deg, rgba(15,20,36,0.9), rgba(11,15,26,0.9))",
      border: `1px solid ${COLORS.borderStrong}`,
      borderRadius: 20, padding: 24, height: 210,
      boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 999, background: `${color}22`,
          display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 22 }}>{icon}</div>
        <div style={{ color: COLORS.green, fontSize: 18 }}>↗</div>
      </div>
      <div style={{ marginTop: 18, fontSize: 56, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>{n}</div>
      <div style={{ marginTop: 4, color: "#fff", fontSize: 15, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2, color: COLORS.muted, fontSize: 13 }}>{sub}</div>
    </div>
  );
};

export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20 } });

  const helloOp = interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" });
  const helloY  = interpolate(frame, [10, 40], [16, 0], { extrapolateRight: "clamp" });

  // Progress ring
  const prog = interpolate(frame - 40, [0, 60], [0, 0.75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hours = Math.round(interpolate(frame - 40, [0, 60], [0, 15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const percent = Math.round(prog * 100);
  const R = 62;
  const C = 2 * Math.PI * R;

  // Weekly bars
  const bars = [0.35, 0.6, 0.4, 0.9, 0.55, 0.75, 0.5];

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <NavBar active="dash" user />

      {/* Header */}
      <div style={{ position: "absolute", top: 120, left: 140, right: 140,
        opacity: helloOp, transform: `translateY(${helloY}px)`,
        display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 13, color: COLORS.cyan, letterSpacing: 3, fontWeight: 800 }}>MOKINIO SRITIS</div>
          <div style={{ marginTop: 8, fontFamily: "'Instrument Serif', serif", fontSize: 68, color: "#fff", letterSpacing: -1.5 }}>
            Sveika, Lukas Stankevičius <span style={{ fontStyle: "italic" }}>👋</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 15, color: COLORS.muted }}>lukas.stankevicius@dev.local</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { l: "✦ Pasiūlyk rezervaciją", bg: "rgba(15,20,36,0.6)", c: "#fff" },
            { l: "🔒 PDF sertifikatas (15/20 val.)", bg: "rgba(15,20,36,0.6)", c: "#c9d3e6" },
            { l: "+ Naršyti užduotis", bg: "linear-gradient(135deg,#67e8f9,#22b8d4)", c: "#0a0d1c" },
          ].map((b, i) => (
            <div key={i} style={{
              padding: "12px 20px", borderRadius: 999, background: b.bg,
              border: `1px solid ${COLORS.borderStrong}`, color: b.c,
              fontSize: 14, fontWeight: 700,
            }}>{b.l}</div>
          ))}
        </div>
      </div>

      {/* Progress card left */}
      <div style={{ position: "absolute", top: 300, left: 140, width: 900, height: 220,
        borderRadius: 22, padding: 32,
        background: "linear-gradient(135deg, rgba(15,20,36,0.9), rgba(11,15,26,0.9))",
        border: `1px solid ${COLORS.borderStrong}`,
        boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", gap: 40,
        opacity: interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {/* Ring */}
        <div style={{ position: "relative", width: 160, height: 160 }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={R} fill="none" stroke={COLORS.border} strokeWidth="10" />
            <circle cx="80" cy="80" r={R} fill="none" stroke={COLORS.cyan} strokeWidth="10"
              strokeDasharray={`${C * prog} ${C}`} strokeLinecap="round" transform="rotate(-90 80 80)" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>{percent}%</div>
            <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2 }}>PROGRESAS</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: COLORS.cyan, letterSpacing: 2, fontWeight: 800 }}>METINIS TIKSLAS</div>
          <div style={{ marginTop: 10, fontFamily: "'Instrument Serif', serif", fontSize: 62, color: "#fff", letterSpacing: -1.5 }}>
            {hours} / 20 val.
          </div>
          <div style={{ marginTop: 4, color: COLORS.muted, fontSize: 15 }}>Liko {20 - hours} val. iki tikslo.</div>
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            {["0 sav. iš eilės", `Vid. ${(hours/8).toFixed(1)} val./sav.`, "3 užbaigti vizitai"].map((c, i) => (
              <div key={i} style={{
                padding: "6px 12px", borderRadius: 999,
                background: [COLORS.orange, COLORS.cyan, COLORS.green][i] + "22",
                color: [COLORS.orange, COLORS.cyan, COLORS.green][i], fontSize: 12, fontWeight: 700,
              }}>{c}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Next visit right */}
      <div style={{ position: "absolute", top: 300, right: 140, width: 640, height: 220,
        borderRadius: 22, padding: 32,
        background: "linear-gradient(135deg, rgba(15,20,36,0.9), rgba(11,15,26,0.9))",
        border: `1px solid ${COLORS.borderStrong}`,
        opacity: interpolate(frame, [40, 65], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{ fontSize: 13, color: COLORS.orange, letterSpacing: 2, fontWeight: 800 }}>KITAS VIZITAS</div>
        <div style={{ marginTop: 16, padding: 20, borderRadius: 14,
          background: "rgba(232,115,74,0.08)", border: `1px dashed ${COLORS.orange}55` }}>
          <div style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>Žalioji Vilnia · Vingio parkas</div>
          <div style={{ marginTop: 6, fontSize: 13, color: COLORS.muted }}>Kovo 20 d. · 14:00 → 17:00 · 3 val.</div>
          <div style={{ marginTop: 12, display: "inline-block", padding: "6px 12px", borderRadius: 999,
            background: `${COLORS.green}22`, color: COLORS.green, fontSize: 12, fontWeight: 700 }}>✓ Patvirtinta</div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div style={{ position: "absolute", top: 550, left: 140, right: 140, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
        <StatCard delay={60}  icon="◷" end={15}  label="Užbaigtos valandos"  sub="iš 20 reikalingų"  color={COLORS.cyan} />
        <StatCard delay={70}  icon="◎" end={5}   label="Liko valandų"        sub="75% iki tikslo"    color={COLORS.orange} />
        <StatCard delay={80}  icon="◈" end={1}   label="Aktyvios rezervacijos" sub="kovo 20 d."      color={COLORS.violet} />
        <StatCard delay={90}  icon="◇" end={3}   label="Organizacijos"       sub="kur savanoriavai"  color={COLORS.green} />
      </div>

      {/* Weekly bars */}
      <div style={{ position: "absolute", top: 810, left: 140, right: 140, height: 220,
        borderRadius: 22, padding: 26,
        background: "linear-gradient(135deg, rgba(15,20,36,0.9), rgba(11,15,26,0.9))",
        border: `1px solid ${COLORS.borderStrong}`,
        opacity: interpolate(frame, [110, 140], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color: "#fff" }}>Savaitinis aktyvumas</div>
            <div style={{ fontSize: 13, color: COLORS.muted }}>Valandos per pastarąsias 8 savaites.</div>
          </div>
          <div style={{ padding: "6px 12px", borderRadius: 999, background: `${COLORS.cyan}22`, color: COLORS.cyan, fontSize: 12, fontWeight: 700 }}>
            15 val. iš viso
          </div>
        </div>
        <div style={{ marginTop: 20, display: "flex", alignItems: "flex-end", gap: 20, height: 110 }}>
          {bars.map((b, i) => {
            const s = spring({ frame: frame - 130 - i * 5, fps, config: { damping: 18 } });
            const h = 100 * b * s;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", height: h, borderRadius: "8px 8px 2px 2px",
                  background: i === 3 ? "linear-gradient(180deg,#67e8f9,#22b8d4)" : "linear-gradient(180deg,#e8734a,#c44a20)" }}/>
                <div style={{ fontSize: 12, color: COLORS.muted }}>S{i + 1}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* kinetic label */}
      <div style={{
        position: "absolute", bottom: 30, right: 60,
        fontFamily: "'Instrument Serif', serif", fontSize: 56, color: "#fff",
        opacity: interpolate(frame, [180, 210], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <span style={{ color: COLORS.muted }}>Sek </span>
        <span style={{ fontStyle: "italic", color: COLORS.cyan }}>progresą.</span>
      </div>
    </AbsoluteFill>
  );
};
