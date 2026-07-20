import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const COLORS = {
  bg0: "#05060d",
  bg1: "#0a0d1c",
  panel: "#0f1424",
  panel2: "#131a2e",
  border: "rgba(148,163,184,0.14)",
  borderStrong: "rgba(148,163,184,0.28)",
  text: "#e6edf7",
  muted: "#8b95ad",
  cyan: "#67e8f9",
  cyanDeep: "#22b8d4",
  cyanSoft: "rgba(103,232,249,0.14)",
  orange: "#e8734a",
  orangeDeep: "#c44a20",
  violet: "#8b5cf6",
  green: "#34d399",
};

export const Heart: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 20s-7-4.5-7-10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 7 3.5C19 15.5 12 20 12 20Z"
      fill="#ffffff"
    />
  </svg>
);

export const Logo: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12 * scale,
      transform: `scale(${scale})`,
      transformOrigin: "left center",
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 999,
        background: "linear-gradient(135deg, #67e8f9, #22b8d4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 24px rgba(103,232,249,0.35)",
      }}
    >
      <Heart size={22} />
    </div>
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: -0.3,
      }}
    >
      <span style={{ color: "#ffffff" }}>Socialinės </span>
      <span style={{ color: COLORS.cyan }}>Valandos</span>
    </div>
  </div>
);

export const NavBar: React.FC<{ active?: "home" | "tasks" | "dash"; user?: boolean }> = ({
  active = "home",
  user = false,
}) => {
  const pill = (label: string, isActive: boolean) => (
    <div
      key={label}
      style={{
        padding: "10px 18px",
        borderRadius: 999,
        color: isActive ? "#0a0d1c" : "#c9d3e6",
        background: isActive
          ? "linear-gradient(135deg, #67e8f9, #22b8d4)"
          : "transparent",
        fontWeight: 600,
        fontSize: 15,
      }}
    >
      {label}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 78,
        display: "flex",
        alignItems: "center",
        padding: "0 56px",
        justifyContent: "space-between",
        borderBottom: `1px solid ${COLORS.border}`,
        background: "rgba(5,6,13,0.6)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Logo />
      <div style={{ display: "flex", gap: 6 }}>
        {pill("Pradžia", active === "home")}
        {pill("Užduotys ir organizacijos", active === "tasks")}
        {user && pill("Mokinio sritis", active === "dash")}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {!user ? (
          <>
            <div style={{ color: "#c9d3e6", fontWeight: 500, fontSize: 15 }}>Prisijungti</div>
            <div
              style={{
                padding: "10px 22px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #67e8f9, #22b8d4)",
                color: "#0a0d1c",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Registruotis
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: `1px solid ${COLORS.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c9d3e6",
              }}
            >
              ◈
            </div>
            <div
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: `1px solid ${COLORS.border}`,
                color: "#c9d3e6",
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Atsijungti
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const Cursor: React.FC<{ x: number; y: number; clicking?: boolean }> = ({
  x,
  y,
  clicking = false,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      pointerEvents: "none",
      zIndex: 999,
      transition: "none",
    }}
  >
    {clicking && (
      <div
        style={{
          position: "absolute",
          left: -18,
          top: -18,
          width: 60,
          height: 60,
          borderRadius: 999,
          border: "2px solid rgba(103,232,249,0.9)",
          animation: "none",
          opacity: 1,
        }}
      />
    )}
    <svg width="28" height="28" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}>
      <path d="M3 2 L3 20 L8 15 L11 22 L14 21 L11 14 L18 14 Z" fill="#ffffff" stroke="#0a0d1c" strokeWidth="1" />
    </svg>
  </div>
);

export const useSpringIn = (delay: number, config = { damping: 18, stiffness: 130 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

export const AmbientBg: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const x1 = 50 + Math.sin(t * 0.25) * 8;
  const y1 = 50 + Math.cos(t * 0.2) * 6;
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(70% 60% at ${x1}% ${y1}%, rgba(103,232,249,0.10), transparent 60%),
                       radial-gradient(50% 50% at 20% 90%, rgba(232,115,74,0.12), transparent 60%),
                       radial-gradient(50% 50% at 85% 15%, rgba(139,92,246,0.10), transparent 60%),
                       linear-gradient(180deg, #05060d 0%, #0a0d1c 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
    </>
  );
};

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const interp = (frame: number, range: [number, number], out: [number, number]) =>
  interpolate(frame, range, out, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
