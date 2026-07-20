import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame } from "../components/BrowserFrame";
import { Cursor } from "../components/Cursor";

export const SceneLogin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22 } });
  const exit = interpolate(frame, [270, 300], [0, 1], { extrapolateRight: "clamp" });

  const scale = interpolate(enter, [0, 1], [0.85, 1]);
  const rotY = interpolate(enter, [0, 1], [-14, 0]);
  const y = interpolate(enter, [0, 1], [60, 0]);
  const exitScale = 1 - exit * 0.08;
  const exitY = -exit * 60;
  const exitOpacity = 1 - exit;

  // Cursor path within panel (panel width 1500, top-left origin at panel)
  // Email field around x=1000 y=370, password around x=1000 y=460, button y=560
  const panelW = 1500;
  const panelH = Math.round(panelW * (740 / 1420));

  // Typed text
  const emailText = "lukas@gimnazija.lt";
  const emailLen = Math.max(0, Math.min(emailText.length, Math.floor((frame - 55) / 1.8)));
  const passLen = Math.max(0, Math.min(9, Math.floor((frame - 110) / 2)));

  // Loading + login click
  const clicked = frame >= 175;
  const loadingProgress = clicked ? Math.min(1, (frame - 175) / 45) : 0;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `translateY(${y + exitY}px) scale(${scale * exitScale}) perspective(2200px) rotateY(${rotY}deg)`,
          opacity: enter * exitOpacity,
          position: "relative",
        }}
      >
        <BrowserFrame src="screens/login.png" width={panelW}>
          {/* Email typed overlay - hide static field text by overlaying a matching rect */}
          <div
            style={{
              position: "absolute",
              left: panelW * 0.61,
              top: panelH * 0.485,
              width: panelW * 0.245,
              height: 28,
              display: "flex",
              alignItems: "center",
              paddingLeft: 30,
              color: "#e6edf7",
              fontSize: 15,
              fontFamily: "Inter, sans-serif",
              background: "#0f1626",
            }}
          >
            {emailText.slice(0, emailLen)}
            {emailLen < emailText.length && frame % 20 < 10 && (
              <span style={{ marginLeft: 2, color: "#60a5fa" }}>|</span>
            )}
          </div>
          {/* Password dots overlay */}
          <div
            style={{
              position: "absolute",
              left: panelW * 0.61,
              top: panelH * 0.61,
              width: panelW * 0.245,
              height: 28,
              display: "flex",
              alignItems: "center",
              paddingLeft: 30,
              color: "#e6edf7",
              fontSize: 20,
              letterSpacing: 4,
              fontFamily: "Inter, sans-serif",
              background: "#0f1626",
            }}
          >
            {"•".repeat(passLen)}
            {passLen < 9 && frame % 20 < 10 && (
              <span style={{ marginLeft: 2, color: "#60a5fa", fontSize: 15 }}>|</span>
            )}
          </div>
          {/* Button loading overlay */}
          {clicked && (
            <div
              style={{
                position: "absolute",
                left: panelW * 0.61,
                top: panelH * 0.735,
                width: panelW * 0.245,
                height: 46,
                borderRadius: 14,
                background: "linear-gradient(90deg, #60a5fa, #22d3ee)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0a0d1c",
                fontWeight: 600,
                fontSize: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${loadingProgress * 100}%`,
                  background: "rgba(255,255,255,0.35)",
                }}
              />
              <span style={{ position: "relative" }}>
                {loadingProgress < 1 ? "Jungiamės..." : "Sveikas, Lukas!"}
              </span>
            </div>
          )}

          <Cursor
            path={[
              { frame: 0, pos: { x: panelW * 0.55, y: panelH * 0.9 } },
              { frame: 40, pos: { x: panelW * 0.68, y: panelH * 0.5 }, click: true },
              { frame: 100, pos: { x: panelW * 0.68, y: panelH * 0.62 }, click: true },
              { frame: 170, pos: { x: panelW * 0.73, y: panelH * 0.755 }, click: true },
              { frame: 260, pos: { x: panelW * 0.73, y: panelH * 0.755 } },
            ]}
          />
        </BrowserFrame>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 90,
          fontSize: 22,
          color: "#9aa7c2",
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: interpolate(frame, [20, 40, 240, 270], [0, 1, 1, 0]),
        }}
      >
        01 · Vienas prisijungimas — visos rolės
      </div>
    </AbsoluteFill>
  );
};
