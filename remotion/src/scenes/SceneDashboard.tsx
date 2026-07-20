import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const Counter: React.FC<{ from: number; to: number; frame: number; delay: number; suffix?: string }> = ({
  from,
  to,
  frame,
  delay,
  suffix = "",
}) => {
  const t = Math.max(0, Math.min(1, (frame - delay) / 45));
  const eased = 1 - Math.pow(1 - t, 3);
  const value = from + (to - from) * eased;
  return (
    <span>
      {Number.isInteger(to) ? Math.round(value) : value.toFixed(1)}
      {suffix}
    </span>
  );
};

const ProgressRing: React.FC<{ progress: number; size: number }> = ({ progress, size }) => {
  const r = (size - 20) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="12" />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        style={{ filter: "drop-shadow(0 0 10px rgba(96,165,250,0.6))" }}
      />
    </svg>
  );
};

const StatCard: React.FC<{
  icon: string;
  label: string;
  frame: number;
  delay: number;
  from: number;
  to: number;
  suffix?: string;
  hint: string;
  color: string;
}> = ({ icon, label, frame, delay, from, to, suffix, hint, color }) => {
  const t = Math.max(0, frame - delay);
  const enter = Math.min(1, t / 22);
  const eased = 1 - Math.pow(1 - enter, 3);
  return (
    <div
      style={{
        opacity: eased,
        transform: `translateY(${(1 - eased) * 36}px) scale(${0.94 + eased * 0.06})`,
        padding: 26,
        borderRadius: 20,
        background: "linear-gradient(160deg, rgba(30,41,68,0.75), rgba(14,20,38,0.9))",
        border: "1px solid rgba(148,163,184,0.15)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}33, transparent 70%)`,
        }}
      />
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: `${color}22`,
          border: `1px solid ${color}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 44, fontWeight: 700, color: "#f4f7ff", fontFamily: "Instrument Serif, serif" }}>
        <Counter from={from} to={to} frame={frame} delay={delay + 5} suffix={suffix} />
      </div>
      <div style={{ fontSize: 15, color: "#c8d2e6", marginTop: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#8b96ad", marginTop: 2 }}>{hint}</div>
    </div>
  );
};

export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 22 } });
  const exit = interpolate(frame, [420, 450], [0, 1], { extrapolateRight: "clamp" });

  const progress = Math.min(1, Math.max(0, (frame - 80) / 60)) * 0.75; // 15/20
  const progressPct = Math.round(progress * 100);

  const bars = [2, 5, 3, 6, 4, 7, 5, 8];

  return (
    <AbsoluteFill
      style={{
        padding: "80px 100px",
        opacity: 1 - exit,
        transform: `translateY(${-exit * 40}px)`,
      }}
    >
      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 30}px)` }}>
        <div style={{ fontSize: 13, letterSpacing: 4, color: "#60a5fa", fontWeight: 600 }}>
          03 · MOKINIO SRITIS
        </div>
        <div
          style={{
            fontFamily: "Instrument Serif, serif",
            fontSize: 86,
            lineHeight: 1,
            color: "#f4f7ff",
            marginTop: 10,
          }}
        >
          Sveika, <span style={{ fontStyle: "italic", color: "#7dd3fc" }}>Lukas</span>
        </div>
      </div>

      {/* Progress hero */}
      <div
        style={{
          marginTop: 44,
          padding: 32,
          borderRadius: 24,
          background:
            "linear-gradient(120deg, rgba(96,165,250,0.14), rgba(34,211,238,0.08), rgba(139,92,246,0.1))",
          border: "1px solid rgba(96,165,250,0.28)",
          display: "flex",
          alignItems: "center",
          gap: 40,
          opacity: interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" })) * 30}px)`,
        }}
      >
        <div style={{ position: "relative", width: 220, height: 220 }}>
          <ProgressRing progress={progress} size={220} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 44, fontFamily: "Instrument Serif, serif", color: "#f4f7ff" }}>
              {progressPct}%
            </div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#8b96ad" }}>PROGRESAS</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, letterSpacing: 3, color: "#7dd3fc", fontWeight: 600 }}>
            METINIS TIKSLAS
          </div>
          <div
            style={{
              fontFamily: "Instrument Serif, serif",
              fontSize: 76,
              color: "#f4f7ff",
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            <Counter from={0} to={15} frame={frame} delay={40} /> / 20{" "}
            <span style={{ fontSize: 40, color: "#7dd3fc" }}>val.</span>
          </div>
          <div style={{ fontSize: 17, color: "#9aa7c2", marginTop: 10 }}>
            Liko 5 val. iki metinio tikslo. Puikus tempas!
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {["3 sav. iš eilės", "Vid. 3.8 val./vizitui", "4 užbaigti vizitai"].map((b, i) => (
              <div
                key={b}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: "rgba(96,165,250,0.15)",
                  border: "1px solid rgba(96,165,250,0.3)",
                  fontSize: 12,
                  color: "#c8d2e6",
                }}
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 18,
        }}
      >
        <StatCard icon="⏱" label="Užbaigtos valandos" from={0} to={15} frame={frame} delay={90} hint="iš 20 reikalingų" color="#60a5fa" />
        <StatCard icon="🎯" label="Liko valandų" from={0} to={5} frame={frame} delay={105} hint="75% iki tikslo" color="#22d3ee" />
        <StatCard icon="📅" label="Aktyvios rezervacijos" from={0} to={2} frame={frame} delay={120} hint="šią savaitę" color="#a78bfa" />
        <StatCard icon="🏢" label="Organizacijos" from={0} to={3} frame={frame} delay={135} hint="kur savanoriavai" color="#f472b6" />
      </div>

      {/* Weekly activity bars */}
      <div
        style={{
          marginTop: 24,
          padding: 26,
          borderRadius: 20,
          background: "linear-gradient(160deg, rgba(30,41,68,0.75), rgba(14,20,38,0.9))",
          border: "1px solid rgba(148,163,184,0.15)",
          opacity: interpolate(frame, [180, 220], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 30, color: "#f4f7ff" }}>
            Savaitinis aktyvumas
          </div>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(96,165,250,0.18)",
              border: "1px solid rgba(96,165,250,0.35)",
              fontSize: 12,
              color: "#7dd3fc",
              fontWeight: 600,
            }}
          >
            {" "}
            <Counter from={0} to={40} frame={frame} delay={200} /> val. iš viso
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 140 }}>
          {bars.map((h, i) => {
            const t = Math.max(0, Math.min(1, (frame - 210 - i * 6) / 20));
            const eased = 1 - Math.pow(1 - t, 3);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: "100%",
                    height: (h / 8) * 100 * eased + "%",
                    background: "linear-gradient(180deg, #60a5fa, #22d3ee)",
                    borderRadius: "10px 10px 4px 4px",
                    boxShadow: "0 0 20px rgba(96,165,250,0.4)",
                  }}
                />
                <div style={{ fontSize: 11, color: "#8b96ad" }}>S{i + 1}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
