import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame } from "../components/BrowserFrame";
import { Cursor } from "../components/Cursor";

const TASKS = [
  { title: "Pagalba senjorų namuose", org: "Radviliškio senelių globa", city: "Radviliškis", hours: 4, tag: "Su senjorais", color: "#f59e0b" },
  { title: "Miesto bibliotekos talka", org: "Miesto biblioteka", city: "Radviliškis", hours: 3, tag: "Kultūra", color: "#a78bfa" },
  { title: "Gyvūnų prieglaudos priežiūra", org: "Prieglauda Letenėlė", city: "Šeduva", hours: 5, tag: "Su gyvūnais", color: "#22d3ee" },
  { title: "Aplinkos tvarkymo talka", org: "Aplinkosaugos klubas", city: "Radviliškis", hours: 3, tag: "Aplinkosauga", color: "#4ade80" },
  { title: "Vaikų dienos centro pagalba", org: "Vaikų dienos centras", city: "Šeduva", hours: 4, tag: "Su vaikais", color: "#f472b6" },
  { title: "Sporto renginio pagalba", org: "Radviliškio SC", city: "Radviliškis", hours: 6, tag: "Sportas", color: "#60a5fa" },
];

const TaskCard: React.FC<{
  task: typeof TASKS[number];
  frame: number;
  delay: number;
  highlighted?: boolean;
}> = ({ task, frame, delay, highlighted }) => {
  const t = Math.max(0, frame - delay);
  const enter = Math.min(1, t / 18);
  const eased = 1 - Math.pow(1 - enter, 3);
  return (
    <div
      style={{
        opacity: eased,
        transform: `translateY(${(1 - eased) * 40}px) scale(${0.94 + eased * 0.06})`,
        padding: 22,
        borderRadius: 18,
        background: highlighted
          ? "linear-gradient(160deg, rgba(96,165,250,0.18), rgba(14,20,38,0.9))"
          : "linear-gradient(160deg, rgba(30,41,68,0.75), rgba(14,20,38,0.9))",
        border: highlighted
          ? "1.5px solid rgba(96,165,250,0.6)"
          : "1px solid rgba(148,163,184,0.14)",
        boxShadow: highlighted
          ? "0 20px 50px rgba(96,165,250,0.25), inset 0 0 40px rgba(96,165,250,0.08)"
          : "0 8px 24px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 168,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            background: `${task.color}22`,
            color: task.color,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          #{task.tag}
        </span>
        <span style={{ fontSize: 12, color: "#8b96ad" }}>📍 {task.city}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, color: "#f4f7ff", lineHeight: 1.25 }}>
        {task.title}
      </div>
      <div style={{ fontSize: 13, color: "#9aa7c2" }}>{task.org}</div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#7dd3fc", fontWeight: 600 }}>
          ⏱ {task.hours} val.
        </span>
        <span
          style={{
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 999,
            background: "linear-gradient(90deg, #60a5fa, #22d3ee)",
            color: "#0a0d1c",
            fontWeight: 600,
          }}
        >
          Rezervuoti →
        </span>
      </div>
    </div>
  );
};

export const SceneTasks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 22 } });
  const exit = interpolate(frame, [420, 450], [0, 1], { extrapolateRight: "clamp" });

  // Reservation modal appears around frame 240
  const modalStart = 240;
  const modalIn = spring({ frame: frame - modalStart, fps, config: { damping: 20 } });
  const modalExit = interpolate(frame, [420, 450], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: "80px 100px" }}>
      {/* Header */}
      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px)` }}>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 4,
            color: "#60a5fa",
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          02 · ATRASKITE GALIMYBES
        </div>
        <div
          style={{
            fontFamily: "Instrument Serif, serif",
            fontSize: 96,
            lineHeight: 1,
            color: "#f4f7ff",
          }}
        >
          Užduotys ir <span style={{ fontStyle: "italic", color: "#7dd3fc" }}>organizacijos</span>
        </div>
        <div style={{ fontSize: 20, color: "#9aa7c2", marginTop: 16, maxWidth: 720 }}>
          Filtruok pagal miestą, kategoriją ar žymes. Rezervuok laiką vienu paspaudimu.
        </div>
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 30,
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {["Visos", "Su senjorais", "Su vaikais", "Su gyvūnais", "Aplinkosauga", "Kultūra", "Sportas"].map(
          (c, i) => (
            <div
              key={c}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.2)",
                background: i === 0 ? "rgba(96,165,250,0.18)" : "rgba(14,20,38,0.6)",
                color: i === 0 ? "#7dd3fc" : "#9aa7c2",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {c}
            </div>
          ),
        )}
      </div>

      {/* Task grid */}
      <div
        style={{
          marginTop: 34,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 22,
        }}
      >
        {TASKS.map((t, i) => (
          <TaskCard
            key={t.title}
            task={t}
            frame={frame}
            delay={60 + i * 12}
            highlighted={i === 0 && frame >= 200}
          />
        ))}
      </div>

      {/* Cursor moves to first card and clicks */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Cursor
          path={[
            { frame: 40, pos: { x: 1600, y: 900 } },
            { frame: 140, pos: { x: 800, y: 500 } },
            { frame: 200, pos: { x: 400, y: 720 }, click: true },
            { frame: 260, pos: { x: 960, y: 540 } },
            { frame: 330, pos: { x: 1180, y: 780 }, click: true },
          ]}
        />
      </div>

      {/* Reservation modal */}
      {frame >= modalStart && (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            background: `rgba(5,6,13,${0.55 * modalIn * (1 - modalExit)})`,
            opacity: 1 - modalExit,
          }}
        >
          <div
            style={{
              width: 640,
              borderRadius: 22,
              overflow: "hidden",
              background: "linear-gradient(180deg, #0f1830, #0a0d1c)",
              border: "1px solid rgba(96,165,250,0.3)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
              transform: `scale(${0.9 + modalIn * 0.1}) translateY(${(1 - modalIn) * 30}px)`,
              opacity: modalIn,
            }}
          >
            <div
              style={{
                padding: "24px 28px",
                background:
                  "linear-gradient(120deg, rgba(96,165,250,0.18), rgba(139,92,246,0.14))",
                borderBottom: "1px solid rgba(148,163,184,0.15)",
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#7dd3fc", fontWeight: 600 }}>
                REZERVACIJA
              </div>
              <div
                style={{
                  fontFamily: "Instrument Serif, serif",
                  fontSize: 34,
                  color: "#f4f7ff",
                  marginTop: 6,
                }}
              >
                Pasirink laiką
              </div>
              <div style={{ fontSize: 13, color: "#9aa7c2", marginTop: 4 }}>
                Pagalba senjorų namuose · Radviliškio senelių globa
              </div>
            </div>
            <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#8b96ad", marginBottom: 6, letterSpacing: 1 }}>
                    PRADŽIA
                  </div>
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "#0a0f1e",
                      border: "1px solid rgba(148,163,184,0.15)",
                      fontSize: 16,
                      color: "#f4f7ff",
                    }}
                  >
                    14:00
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#8b96ad", marginBottom: 6, letterSpacing: 1 }}>
                    PABAIGA
                  </div>
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "#0a0f1e",
                      border: "1px solid rgba(148,163,184,0.15)",
                      fontSize: 16,
                      color: "#f4f7ff",
                    }}
                  >
                    18:00
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background:
                    "linear-gradient(120deg, rgba(96,165,250,0.14), rgba(34,211,238,0.08))",
                  border: "1px solid rgba(96,165,250,0.3)",
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: 2, color: "#7dd3fc", fontWeight: 600 }}>
                  NUMATOMOS VALANDOS
                </div>
                <div
                  style={{
                    fontSize: 28,
                    color: "#f4f7ff",
                    marginTop: 6,
                    fontFamily: "Instrument Serif, serif",
                  }}
                >
                  14:00 → 18:00 ={" "}
                  <span style={{ color: "#22d3ee" }}>
                    {(() => {
                      const c = Math.min(4, Math.max(0, (frame - modalStart - 30) / 15));
                      return `${c.toFixed(1)} val.`;
                    })()}
                  </span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: "14px 22px",
                  borderRadius: 14,
                  background:
                    frame > 330
                      ? "linear-gradient(90deg, #22c55e, #4ade80)"
                      : "linear-gradient(90deg, #60a5fa, #22d3ee)",
                  color: "#0a0d1c",
                  fontWeight: 700,
                  textAlign: "center",
                  fontSize: 16,
                  transition: "background 0.2s",
                }}
              >
                {frame > 330 ? "✓ Rezervacija išsiųsta!" : "Siųsti rezervaciją →"}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
