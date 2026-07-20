import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { AmbientBg, NavBar, COLORS, Cursor, interp } from "../ui/primitives";

const TAGS = ["#Lauke", "#Viduje", "#Su vaikais", "#Su senjorais", "#Aplinkosauga", "#Kultūra", "#Sportas", "#Švietimas", "#Talka"];

const TASKS = [
  { title: "Pagalba Raudonojo Kryžiaus draugijai", org: "Raudonasis Kryžius", city: "Vilnius", tag: "Su senjorais", h: 4 },
  { title: "Aplinkos tvarkymo talka Vingio parke", org: "Švari Lietuva", city: "Vilnius", tag: "Aplinkosauga", h: 3 },
  { title: "Pamokų pagalba pradinukams", org: "Vaikų dienos centras", city: "Kaunas", tag: "Su vaikais", h: 2 },
  { title: "Renginio organizavimas – Kultūros diena", org: "Panevėžio biblioteka", city: "Panevėžys", tag: "Kultūra", h: 5 },
  { title: "Gyvūnų priežiūra prieglaudoje", org: "Letenėlė", city: "Klaipėda", tag: "Su gyvūnais", h: 3 },
  { title: "Sporto renginio savanoris", org: "Sporto klubas Ąžuolas", city: "Vilnius", tag: "Sportas", h: 6 },
];

export const SceneTasks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, config: { damping: 20 } });
  const subIn = spring({ frame: frame - 10, fps, config: { damping: 22 } });
  const tabsIn = spring({ frame: frame - 20, fps, config: { damping: 20 } });
  const filtersIn = spring({ frame: frame - 32, fps, config: { damping: 20 } });

  // cursor: search → filter → task card → propose custom button → modal
  const cx = interp(frame, [40, 70, 100, 140, 170, 210, 260, 310, 340], [1800, 900, 900, 700, 700, 1600, 1600, 1200, 1200]);
  const cy = interp(frame, [40, 70, 100, 140, 170, 210, 260, 310, 340], [900, 320, 320, 500, 500, 320, 320, 640, 640]);
  const clicking = (frame >= 68 && frame <= 76) || (frame >= 208 && frame <= 218) || (frame >= 338 && frame <= 348);

  // modal opens after propose click
  const modalIn = spring({ frame: frame - 220, fps, config: { damping: 18, stiffness: 120 } });

  // typing time in modal
  const startH = Math.min(Math.max(0, Math.floor((frame - 260) / 3)), 3);

  const outO = interp(frame, [400, 420], [1, 0]);

  return (
    <AbsoluteFill style={{ opacity: outO }}>
      <AmbientBg />
      <NavBar active="tasks" />

      {/* Header */}
      <div style={{ position: "absolute", top: 130, left: 100, right: 100 }}>
        <div
          style={{
            color: COLORS.cyan,
            letterSpacing: 2,
            fontSize: 14,
            fontWeight: 700,
            opacity: headerIn,
            transform: `translateY(${(1 - headerIn) * 20}px)`,
          }}
        >
          ATRASKITE GALIMYBES
        </div>
        <div
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 84,
            color: "#fff",
            letterSpacing: -1.5,
            marginTop: 8,
            opacity: subIn,
            transform: `translateY(${(1 - subIn) * 20}px)`,
          }}
        >
          Užduotys ir organizacijos
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginTop: 28, opacity: tabsIn }}>
          <div style={{ padding: "10px 22px", borderRadius: 999, background: "linear-gradient(135deg, #67e8f9, #22b8d4)", color: "#0a0d1c", fontWeight: 700, fontSize: 15 }}>Užduotys</div>
          <div style={{ padding: "10px 22px", borderRadius: 999, background: COLORS.panel, color: "#c9d3e6", fontWeight: 500, fontSize: 15, border: `1px solid ${COLORS.border}` }}>Organizacijos</div>
        </div>

        {/* Filter row */}
        <div style={{ display: "flex", gap: 14, marginTop: 22, alignItems: "center", opacity: filtersIn, transform: `translateY(${(1 - filtersIn) * 15}px)` }}>
          <div style={{ flex: 1, padding: "16px 20px", borderRadius: 999, background: COLORS.panel, border: `1px solid ${COLORS.border}`, color: COLORS.muted, fontSize: 15 }}>
            🔍 Paieška: pavadinimas, vieta, organizacija…
          </div>
          <div style={{ padding: "16px 22px", borderRadius: 999, background: COLORS.panel, border: `1px solid ${COLORS.border}`, color: "#c9d3e6", fontSize: 15 }}>📍 Visi miestai ▾</div>
          <div style={{ padding: "16px 22px", borderRadius: 999, background: COLORS.panel, border: `1px solid ${COLORS.border}`, color: "#c9d3e6", fontSize: 15 }}>▽ Visos kategorijos ▾</div>
          <div
            style={{
              padding: "16px 26px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #67e8f9, #22b8d4)",
              color: "#0a0d1c",
              fontWeight: 700,
              fontSize: 15,
              boxShadow: `0 12px 30px rgba(103,232,249,${frame >= 320 && frame <= 350 ? 0.6 : 0.25})`,
              transform: frame >= 335 && frame <= 348 ? "scale(0.97)" : "scale(1)",
            }}
          >
            ✦ Pasiūlyk savo rezervaciją
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          {TAGS.map((t, i) => {
            const s = spring({ frame: frame - 42 - i * 3, fps, config: { damping: 20 } });
            return (
              <div
                key={t}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: COLORS.panel,
                  border: `1px solid ${COLORS.border}`,
                  color: "#c9d3e6",
                  fontSize: 13,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 10}px)`,
                }}
              >
                {t}
              </div>
            );
          })}
        </div>

        {/* Task cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 34 }}>
          {TASKS.map((t, i) => {
            const s = spring({ frame: frame - 90 - i * 6, fps, config: { damping: 18 } });
            const highlight = i === 0 && frame >= 200 && frame <= 240;
            return (
              <div
                key={t.title}
                style={{
                  padding: 22,
                  borderRadius: 20,
                  background: highlight
                    ? "linear-gradient(180deg, rgba(103,232,249,0.10), rgba(15,20,36,0.95))"
                    : "linear-gradient(180deg, rgba(19,26,46,0.9), rgba(15,20,36,0.95))",
                  border: `1px solid ${highlight ? COLORS.cyanDeep : COLORS.border}`,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 30}px)`,
                  boxShadow: highlight ? "0 20px 40px rgba(103,232,249,0.15)" : "0 12px 28px rgba(0,0,0,0.35)",
                  minHeight: 180,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.cyanSoft, color: COLORS.cyan, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                    #{t.tag}
                  </div>
                  <div style={{ color: COLORS.muted, fontSize: 12 }}>📍 {t.city}</div>
                </div>
                <div style={{ color: "#fff", fontSize: 19, fontWeight: 700, marginTop: 14, lineHeight: 1.3 }}>{t.title}</div>
                <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 8 }}>{t.org}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                  <div style={{ color: COLORS.cyan, fontWeight: 700, fontSize: 15 }}>~{t.h} val.</div>
                  <div style={{ padding: "8px 14px", borderRadius: 999, background: COLORS.panel2, border: `1px solid ${COLORS.borderStrong}`, color: "#fff", fontSize: 13, fontWeight: 600 }}>
                    Rezervuoti →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modalIn > 0.01 && (
        <>
          <div style={{ position: "absolute", inset: 0, background: `rgba(5,6,13,${0.65 * modalIn})`, backdropFilter: "blur(4px)" }} />
          <div
            style={{
              position: "absolute",
              top: 220,
              left: "50%",
              width: 620,
              transform: `translate(-50%, ${(1 - modalIn) * 30}px) scale(${0.95 + modalIn * 0.05})`,
              opacity: modalIn,
              borderRadius: 24,
              overflow: "hidden",
              background: COLORS.panel,
              border: `1px solid ${COLORS.borderStrong}`,
              boxShadow: "0 40px 80px rgba(0,0,0,0.7)",
            }}
          >
            <div
              style={{
                padding: "28px 32px",
                background: "linear-gradient(135deg, #0f2a3a, #1a3d52)",
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div style={{ color: COLORS.cyan, letterSpacing: 2, fontSize: 12, fontWeight: 700 }}>PASIŪLYK SAVO REZERVACIJĄ</div>
              <div style={{ color: "#fff", fontFamily: "'Instrument Serif', serif", fontSize: 34, marginTop: 6 }}>
                Pasirink organizaciją ir laiką
              </div>
              <div style={{ color: COLORS.muted, fontSize: 14, marginTop: 6 }}>
                Tavo užklausa bus išsiųsta organizacijai patvirtinimui.
              </div>
            </div>
            <div style={{ padding: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { label: "Pradžia", val: "14:00" },
                  { label: "Pabaiga", val: "17:00" },
                ].map((f) => (
                  <div key={f.label}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 15, fontWeight: 600 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 999, background: COLORS.cyan }} />
                      {f.label}
                    </div>
                    <div style={{ marginTop: 10, padding: "14px 16px", borderRadius: 12, background: "#0b1020", border: `1px solid ${COLORS.border}`, color: "#fff", fontSize: 18, fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
                      <span>{f.val}</span>
                      <span style={{ color: COLORS.muted }}>🕓</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 22, padding: 20, borderRadius: 16, background: "rgba(103,232,249,0.06)", border: `1px solid ${COLORS.cyanDeep}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 999, background: COLORS.cyanSoft, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.cyan }}>✦</div>
                  <div>
                    <div style={{ color: COLORS.cyan, fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>NUMATOMOS VALANDOS</div>
                    <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                      14:00 → 17:00{" "}
                      <span style={{ color: COLORS.cyan, fontFamily: "'Instrument Serif', serif" }}>= {startH} val.</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
                <div style={{ color: COLORS.muted, fontSize: 14 }}>Atšaukti</div>
                <div style={{ padding: "14px 22px", borderRadius: 999, background: "linear-gradient(135deg, #67e8f9, #22b8d4)", color: "#0a0d1c", fontWeight: 700, fontSize: 15 }}>
                  ✓ Siųsti pasiūlymą
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Cursor x={cx} y={cy} clicking={clicking} />
    </AbsoluteFill>
  );
};
