import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../ui/primitives";

type Task = { title: string; org: string; hours: number; cat: string; color: string };
const TASKS: Task[] = [
  { title: "Sodinti medžius parke",    org: "Žalioji Vilnia",   hours: 4, cat: "Aplinka", color: COLORS.green },
  { title: "Padėti bibliotekoje",       org: "Miesto biblioteka",hours: 3, cat: "Švietimas", color: COLORS.cyan },
  { title: "Senjorų dienos centras",    org: "Caritas",          hours: 5, cat: "Sveikata",  color: COLORS.orange },
  { title: "Meno dirbtuvės vaikams",    org: "Kultūros namai",   hours: 2, cat: "Menas",     color: COLORS.violet },
  { title: "Gyvūnų prieglauda",         org: "Letenėlė",         hours: 4, cat: "Aplinka",   color: COLORS.green },
  { title: "Renginio organizavimas",    org: "Jaunimo centras",  hours: 6, cat: "Menas",     color: COLORS.violet },
];

const CATS = ["Visi", "Aplinka", "Švietimas", "Sveikata", "Menas"];

export const SceneOpportunities: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Filter: after frame 150, "Aplinka" activates and non-matching cards fade
  const filterActive = frame > 150;
  const activeCat = filterActive ? "Aplinka" : "Visi";
  const filterChipS = spring({ frame: frame - 150, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 80, left: 0, right: 0, textAlign: "center", opacity: titleOp }}>
        <div style={{ fontSize: 14, color: COLORS.cyan, letterSpacing: 4, fontWeight: 700 }}>◆ RASK GALIMYBES</div>
        <div style={{ fontSize: 72, fontFamily: "'Instrument Serif', serif", color: "#fff", marginTop: 8, letterSpacing: -1.5 }}>
          Užduotys, kurios <span style={{ fontStyle: "italic", color: COLORS.orange }}>tinka tau</span>
        </div>
      </div>

      {/* Category chips */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12 }}>
        {CATS.map((c, i) => {
          const chipIn = spring({ frame: frame - 30 - i * 5, fps, config: { damping: 18 } });
          const isActive = c === activeCat;
          return (
            <div key={c} style={{
              padding: "12px 24px", borderRadius: 999,
              background: isActive ? "linear-gradient(135deg,#67e8f9,#22b8d4)" : "rgba(15,20,36,0.8)",
              border: `1px solid ${isActive ? "transparent" : COLORS.border}`,
              color: isActive ? "#0a0d1c" : "#c9d3e6",
              fontWeight: 700, fontSize: 15,
              transform: `scale(${chipIn}) ${isActive && c !== "Visi" ? `scale(${1 + filterChipS * 0.08})` : ""}`,
              boxShadow: isActive ? "0 10px 30px rgba(103,232,249,0.35)" : "none",
            }}>{c}</div>
          );
        })}
      </div>

      {/* Task cards grid 3x2 */}
      <div style={{ position: "absolute", top: 400, left: 220, right: 220, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {TASKS.map((t, i) => {
          const cardIn = spring({ frame: frame - 60 - i * 8, fps, config: { damping: 16, stiffness: 100 } });
          const matches = activeCat === "Visi" || t.cat === activeCat;
          const filterFade = filterActive ? interpolate(frame - 150, [0, 25], matches ? [1, 1] : [1, 0.15], { extrapolateRight: "clamp" }) : 1;
          const filterScale = filterActive ? interpolate(frame - 150, [0, 25], matches ? [1, 1.04] : [1, 0.92], { extrapolateRight: "clamp" }) : 1;
          return (
            <div key={i} style={{
              opacity: cardIn * filterFade,
              transform: `translateY(${(1 - cardIn) * 30}px) scale(${filterScale})`,
              background: `linear-gradient(180deg, ${COLORS.panel} 0%, ${COLORS.panel2} 100%)`,
              border: `1px solid ${matches && filterActive ? t.color + "88" : COLORS.borderStrong}`,
              borderRadius: 20, padding: 24, height: 210,
              boxShadow: matches && filterActive ? `0 20px 50px ${t.color}22` : "0 10px 30px rgba(0,0,0,0.3)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: t.color,
                  background: t.color + "22", padding: "5px 10px", borderRadius: 999,
                }}>{t.cat.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: COLORS.muted, fontWeight: 600 }}>◷ {t.hours}h</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginTop: 20, lineHeight: 1.25 }}>{t.title}</div>
              <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 10 }}>{t.org}</div>
              <div style={{ marginTop: 18, display: "inline-block", padding: "8px 16px", borderRadius: 999,
                background: t.color, color: "#0a0d1c", fontWeight: 700, fontSize: 13 }}>
                Rezervuoti →
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
