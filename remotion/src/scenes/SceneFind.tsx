import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, NavBar } from "../ui/primitives";

// Recreated "Užduotys ir organizacijos" page from file-22.
type Task = { title: string; org: string; city: string; hours: number; cat: string; color: string };
const TASKS: Task[] = [
  { title: "Sodinti medžius Vingio parke", org: "Žalioji Vilnia", city: "Vilnius", hours: 4, cat: "Aplinkosauga", color: COLORS.green },
  { title: "Skaityti senjorams",            org: "Caritas",         city: "Kaunas",  hours: 3, cat: "Su senjorais",  color: COLORS.orange },
  { title: "Meno dirbtuvės",                org: "Kultūros namai",  city: "Vilnius", hours: 2, cat: "Kūrybiškas",    color: COLORS.violet },
  { title: "Gyvūnų prieglauda",             org: "Letenėlė",         city: "Klaipėda",hours: 4, cat: "Su gyvūnais",   color: COLORS.cyan },
  { title: "Bibliotekos talka",             org: "Miesto biblioteka",city: "Vilnius", hours: 3, cat: "Švietimas",     color: COLORS.cyan },
  { title: "Sporto renginys mokiniams",     org: "Jaunimo centras", city: "Šiauliai",hours: 6, cat: "Sportas",       color: COLORS.orange },
];
const TAGS = ["#Lauke", "#Su vaikais", "#Su senjorais", "#Su gyvūnais", "#Aplinkosauga", "#Kultūra", "#Sportas", "#Švietimas", "#Renginys", "#Talka", "#Kūrybiškas"];

export const SceneFind: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20 } });

  const titleW = interpolate(frame, [10, 40], [0, 100], { extrapolateRight: "clamp" });
  const searchIn = spring({ frame: frame - 30, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <NavBar active="tasks" user />

      {/* Header */}
      <div style={{ position: "absolute", top: 130, left: 140, right: 140 }}>
        <div style={{ fontSize: 14, color: COLORS.cyan, letterSpacing: 3, fontWeight: 700 }}>ATRASKITE GALIMYBES</div>
        <div style={{
          marginTop: 10, fontFamily: "'Instrument Serif', serif", fontSize: 84, color: "#fff", letterSpacing: -2,
          clipPath: `inset(0 ${100 - titleW}% 0 0)`,
        }}>Užduotys ir organizacijos</div>
        <div style={{ marginTop: 8, fontSize: 18, color: COLORS.muted, maxWidth: 720,
          opacity: interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" }) }}>
          <span style={{color:"#fff", fontWeight: 700}}>{Math.min(6, Math.floor(interpolate(frame,[60,90],[0,6],{extrapolateRight:"clamp"})))} </span>
          atvirų užduočių iš <span style={{color:"#fff", fontWeight:700}}>156</span> organizacijų. Filtruok pagal miestą, kategoriją arba raktinius žodžius.
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 26, display: "inline-flex", background: "rgba(15,20,36,0.6)", borderRadius: 999, padding: 4,
          transform: `scale(${searchIn})`, transformOrigin: "left center" }}>
          <div style={{ padding: "10px 22px", borderRadius: 999, background: "linear-gradient(135deg,#67e8f9,#22b8d4)", color: "#0a0d1c", fontWeight: 700, fontSize: 14 }}>Užduotys</div>
          <div style={{ padding: "10px 22px", borderRadius: 999, color: "#c9d3e6", fontWeight: 600, fontSize: 14 }}>Organizacijos</div>
        </div>

        {/* Filter row */}
        <div style={{ marginTop: 20, display: "flex", gap: 16, opacity: searchIn }}>
          <div style={{ flex: 1, height: 50, borderRadius: 999, background: "rgba(15,20,36,0.7)",
            border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", padding: "0 20px",
            color: COLORS.muted, fontSize: 14, gap: 10 }}>
            <span>🔍</span> Paieška: pavadinimas, vieta, organizacija...
          </div>
          <div style={{ height: 50, borderRadius: 999, padding: "0 22px", background: "rgba(15,20,36,0.7)",
            border: `1px solid ${COLORS.border}`, color: "#c9d3e6", fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}>◉ Visi miestai ⌄</div>
          <div style={{ height: 50, borderRadius: 999, padding: "0 22px", background: "rgba(15,20,36,0.7)",
            border: `1px solid ${COLORS.border}`, color: "#c9d3e6", fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}>▽ Visos kategorijos ⌄</div>
          <div style={{ height: 50, borderRadius: 999, padding: "0 22px",
            background: "linear-gradient(135deg,#67e8f9,#22b8d4)", color: "#0a0d1c", fontSize: 14, fontWeight: 800,
            display: "flex", alignItems: "center", gap: 8 }}>✦ Pasiūlyk savo rezervaciją</div>
        </div>

        {/* Tag chips */}
        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 2, fontWeight: 700, marginRight: 8 }}>ŽYMOS</div>
          {TAGS.map((t, i) => {
            const s = spring({ frame: frame - 60 - i * 3, fps, config: { damping: 20 } });
            return (
              <div key={t} style={{
                padding: "6px 14px", borderRadius: 999,
                background: "rgba(15,20,36,0.6)", border: `1px solid ${COLORS.border}`,
                color: "#c9d3e6", fontSize: 13, fontWeight: 600,
                transform: `scale(${s})`, opacity: s,
              }}>{t}</div>
            );
          })}
        </div>
      </div>

      {/* Task grid */}
      <div style={{ position: "absolute", top: 640, left: 140, right: 140, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
        {TASKS.map((t, i) => {
          const s = spring({ frame: frame - 120 - i * 10, fps, config: { damping: 16, stiffness: 100 } });
          const float = Math.sin((frame - i * 8) / 22) * 3;
          return (
            <div key={i} style={{
              opacity: s, transform: `translateY(${(1 - s) * 30 + float}px)`,
              background: "linear-gradient(180deg, rgba(15,20,36,0.9), rgba(11,15,26,0.9))",
              border: `1px solid ${COLORS.borderStrong}`,
              borderRadius: 20, padding: 22, height: 200,
              boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: t.color,
                  background: t.color + "22", padding: "5px 12px", borderRadius: 999,
                }}>#{t.cat}</div>
                <div style={{ fontSize: 13, color: COLORS.muted, fontWeight: 700 }}>◷ {t.hours}h</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 16, lineHeight: 1.25 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 8 }}>◉ {t.city} · {t.org}</div>
              <div style={{ marginTop: 14, display: "inline-block", padding: "8px 16px", borderRadius: 999,
                background: t.color, color: "#0a0d1c", fontWeight: 800, fontSize: 12 }}>Rezervuoti →</div>
            </div>
          );
        })}
      </div>

      {/* Kinetic label */}
      <div style={{
        position: "absolute", bottom: 40, right: 60,
        fontFamily: "'Instrument Serif', serif", fontSize: 60, color: "#fff",
        opacity: interpolate(frame, [150, 180], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(frame, [150, 180], [20, 0], { extrapolateRight: "clamp" })}px)`,
      }}>
        <span style={{ color: COLORS.muted }}>Rask. </span>
        <span style={{ fontStyle: "italic", color: COLORS.cyan }}>Filtruok.</span>
      </div>
    </AbsoluteFill>
  );
};
