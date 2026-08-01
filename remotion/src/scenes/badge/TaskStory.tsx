import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { BadgeSpec } from "../../badges";
import { AppWindow, Backdrop, BG, body, clampIn, Confetti, display, Flash, lucide, Pointer, REVEAL, RevealCard, Shockwave, Vignette } from "./kit";

const ROWS = [
  "Senelių namai · pagalba",
  "Bibliotekos tvarkymas",
  "Parko talka",
  "Maisto banko akcija",
  "Gyvūnų prieglauda",
];

/**
 * TASKS — the student's task list inside the app, ticked off one by one by a
 * real cursor, with the progress bar racing to 10/10.
 */
export const TaskStory: React.FC<{ badge: BadgeSpec }> = ({ badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Check = lucide("Check");

  const total = badge.count ?? 10;
  const START = 22;
  const GAP = 16;
  const rowH = 92;
  const winIn = spring({ frame, fps, config: { damping: 18, stiffness: 130 } });
  const storyOut = 1 - clampIn(frame, 100, 118);

  const checked = Math.max(0, Math.min(ROWS.length, Math.floor((frame - START) / GAP) + 1));
  const shown = Math.min(total, Math.round((checked / ROWS.length) * total));
  const barIn = clampIn(frame, START, START + ROWS.length * GAP);

  // cursor walks the list
  const path = [
    { frame: 6, x: 860, y: 940 },
    ...ROWS.map((_, i) => ({ frame: START + i * GAP, x: 300, y: 440 + i * rowH, click: true })),
    { frame: START + ROWS.length * GAP + 12, x: 300, y: 440 + (ROWS.length - 1) * rowH },
  ];

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Backdrop badge={badge} mood="paper" />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: storyOut }}>
        <div style={{ transform: `scale(${interpolate(winIn, [0, 1], [0.85, 1])})`, opacity: winIn }}>
          <AppWindow badge={badge} title="socialinesvalandos.dev / užduotys" width={820}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 22 }}>
              <p style={{ fontFamily: body, fontWeight: 700, fontSize: 26, color: "#8B94A8", margin: 0 }}>
                Užbaigti vizitai
              </p>
              <p style={{ fontFamily: display, fontSize: 46, color: "#F2F5FB", margin: 0 }}>
                {shown}/{total}
              </p>
            </div>

            <div style={{ height: 14, borderRadius: 99, background: "#FFFFFF10", overflow: "hidden", marginBottom: 26 }}>
              <div
                style={{
                  height: "100%",
                  width: `${barIn * 100}%`,
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${badge.from}, ${badge.to})`,
                  boxShadow: `0 0 24px ${badge.to}aa`,
                }}
              />
            </div>

            {ROWS.map((r, i) => {
              const at = START + i * GAP;
              const on = i < checked;
              const s = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 240 } });
              return (
                <div
                  key={r}
                  style={{
                    height: rowH - 14,
                    marginBottom: 14,
                    borderRadius: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    padding: "0 22px",
                    background: on ? `${badge.from}1F` : "#FFFFFF08",
                    border: `1px solid ${on ? `${badge.to}55` : "#FFFFFF12"}`,
                    transform: `scale(${on ? 0.99 + s * 0.01 : 1})`,
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: on ? `linear-gradient(140deg, ${badge.from}, ${badge.to})` : "transparent",
                      border: on ? "none" : "2px solid #FFFFFF2A",
                      transform: `scale(${on ? 0.7 + s * 0.3 : 1})`,
                      boxShadow: on ? `0 0 26px ${badge.to}66` : "none",
                    }}
                  >
                    {on && <Check size={30} color={BG} strokeWidth={3.4} />}
                  </div>
                  <span
                    style={{
                      fontFamily: body,
                      fontWeight: 700,
                      fontSize: 27,
                      color: on ? "#E9EDF6" : "#798294",
                      textDecoration: on ? "line-through" : "none",
                      textDecorationColor: `${badge.to}88`,
                    }}
                  >
                    {r}
                  </span>
                </div>
              );
            })}
          </AppWindow>
        </div>
      </AbsoluteFill>

      <div style={{ opacity: storyOut }}>
        <Pointer path={path} hideAt={START + ROWS.length * GAP + 16} />
      </div>

      <Shockwave color={badge.to} at={100} size={400} />
      <Confetti from={badge.from} to={badge.to} at={102} originY={0.45} />
      <Flash at={100} strength={0.5} />
      <RevealCard badge={badge} start={REVEAL} />
      <Vignette />
    </AbsoluteFill>
  );
};
