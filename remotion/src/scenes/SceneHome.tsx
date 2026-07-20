import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { AmbientBg, NavBar, COLORS, interp } from "../ui/primitives";

export const SceneHome: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const navY = spring({ frame, fps, config: { damping: 20 } });
  const badge = spring({ frame: frame - 12, fps, config: { damping: 16 } });
  const h1a = spring({ frame: frame - 22, fps, config: { damping: 18 } });
  const h1b = spring({ frame: frame - 32, fps, config: { damping: 18 } });
  const sub = spring({ frame: frame - 46, fps, config: { damping: 20 } });
  const btns = spring({ frame: frame - 58, fps, config: { damping: 18 } });

  // floating stat chips
  const chip = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 15 } });
  const t = frame / 30;

  const outO = interp(frame, [210, 240], [1, 0]);
  return (
    <AbsoluteFill style={{ opacity: outO }}>
      <AmbientBg />
      <div style={{ transform: `translateY(${(1 - navY) * -30}px)`, opacity: navY }}>
        <NavBar active="home" />
      </div>

      {/* floating orange radial glow behind hero */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 380,
          width: 1400,
          height: 700,
          transform: "translateX(-50%)",
          background: "radial-gradient(closest-side, rgba(232,115,74,0.18), transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* badge */}
      <div
        style={{
          position: "absolute",
          top: 220,
          left: "50%",
          transform: `translate(-50%, ${(1 - badge) * 20}px)`,
          opacity: badge,
          padding: "10px 22px",
          borderRadius: 999,
          background: "rgba(15,20,36,0.9)",
          border: `1px solid ${COLORS.border}`,
          color: "#c9d3e6",
          fontSize: 13,
          letterSpacing: 2,
          fontWeight: 600,
        }}
      >
        <span style={{ color: COLORS.orange, marginRight: 10 }}>✦</span>
        LIETUVOS MOKSLEIVIAMS · NEMOKAMAI
      </div>

      {/* headline */}
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "'Instrument Serif', serif",
          fontSize: 118,
          lineHeight: 1.05,
          letterSpacing: -2,
          color: "#ffffff",
        }}
      >
        <div style={{ opacity: h1a, transform: `translateY(${(1 - h1a) * 30}px)` }}>
          Kiekviena{" "}
          <span style={{ fontStyle: "italic", background: "linear-gradient(90deg, #e8734a, #f4b183)", WebkitBackgroundClip: "text", color: "transparent" }}>valanda</span>
          {" — "}
        </div>
        <div style={{ opacity: h1b, transform: `translateY(${(1 - h1b) * 30}px)` }}>
          žingsnis pokyčio link
        </div>
      </div>

      {/* subtitle */}
      <div
        style={{
          position: "absolute",
          top: 620,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "#a8b3c7",
          fontSize: 26,
          lineHeight: 1.5,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 15}px)`,
        }}
      >
        Vienintelė Lietuvoje platforma, sujungianti ambicingus <br />
        mokinius su prasmingomis savanorystės galimybėmis.
      </div>

      {/* CTAs */}
      <div
        style={{
          position: "absolute",
          top: 760,
          left: "50%",
          transform: `translate(-50%, ${(1 - btns) * 20}px)`,
          opacity: btns,
          display: "flex",
          gap: 20,
        }}
      >
        <div
          style={{
            padding: "20px 34px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #e8734a, #c44a20)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 18,
            boxShadow: "0 20px 40px -12px rgba(232,115,74,0.55)",
          }}
        >
          Pradėti savanorystę →
        </div>
        <div
          style={{
            padding: "20px 34px",
            borderRadius: 999,
            background: COLORS.panel,
            color: "#fff",
            fontWeight: 600,
            fontSize: 18,
            border: `1px solid ${COLORS.borderStrong}`,
          }}
        >
          Naršyti užduotis
        </div>
      </div>

      {/* floating stat cards */}
      {[
        { label: "Mokinių", value: "2 340+", d: 40, x: 140, y: 260 },
        { label: "Organizacijų", value: "180", d: 55, x: 1560, y: 320 },
        { label: "Valandų suteikta", value: "48 210", d: 70, x: 100, y: 720 },
        { label: "Mokyklų", value: "42", d: 85, x: 1580, y: 700 },
      ].map((c) => {
        const s = chip(c.d);
        const float = Math.sin(t * 0.8 + c.d) * 6;
        return (
          <div
            key={c.label}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y + float,
              opacity: s,
              transform: `scale(${s})`,
              padding: "18px 24px",
              borderRadius: 20,
              background: "rgba(15,20,36,0.85)",
              border: `1px solid ${COLORS.borderStrong}`,
              backdropFilter: "blur(6px)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              minWidth: 180,
            }}
          >
            <div style={{ color: COLORS.muted, fontSize: 12, letterSpacing: 1.5, fontWeight: 600 }}>
              {c.label.toUpperCase()}
            </div>
            <div style={{ color: "#fff", fontSize: 32, fontWeight: 800, marginTop: 4, fontFamily: "'Instrument Serif', serif" }}>
              {c.value}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
