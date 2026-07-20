import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, Heart } from "../ui/primitives";

// UI fragments fly in and assemble around the logo → tagline reveal.
const Fragment: React.FC<{
  delay: number; fromX: number; fromY: number; x: number; y: number;
  w: number; h: number; radius?: number; color?: string; content?: React.ReactNode;
}> = ({ delay, fromX, fromY, x, y, w, h, radius = 16, color = COLORS.panel, content }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
  const cx = fromX + (x - fromX) * s;
  const cy = fromY + (y - fromY) * s;
  return (
    <div style={{
      position: "absolute", left: cx, top: cy, width: w, height: h,
      borderRadius: radius, background: color,
      border: `1px solid ${COLORS.borderStrong}`,
      opacity: interpolate(s, [0, 0.3], [0, 1]),
      transform: `rotate(${interpolate(s, [0, 1], [-6, 0])}deg)`,
      boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{content}</div>
  );
};

export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame: frame - 45, fps, config: { damping: 14, stiffness: 100 } });
  const tagOp = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: "clamp" });
  const tagY  = interpolate(frame, [80, 110], [20, 0], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [130, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <Fragment delay={0}  fromX={-260} fromY={-120} x={300} y={200} w={230} h={82}
        content={<div style={{color: COLORS.cyan, fontWeight:700, fontSize:13, letterSpacing:1}}>◆ 156 ORGANIZACIJŲ</div>}/>
      <Fragment delay={6}  fromX={2200} fromY={-100} x={1380} y={190} w={270} h={100}
        content={<div style={{textAlign:"center"}}>
          <div style={{fontSize:11, color:COLORS.muted, letterSpacing:1.5}}>VALANDŲ ATLIKTA</div>
          <div style={{fontSize:32, fontWeight:800, color:"#fff"}}>48,320</div>
        </div>}/>
      <Fragment delay={10} fromX={-200} fromY={1300} x={260} y={780} w={340} h={110} color={COLORS.panel2}
        content={<div style={{width:"85%"}}>
          <div style={{fontSize:11, color: COLORS.muted, letterSpacing:1.5, marginBottom:8}}>PAŽANGA</div>
          <div style={{height:8, background: COLORS.border, borderRadius:99}}>
            <div style={{width:"70%", height:"100%", background:"linear-gradient(90deg,#67e8f9,#22b8d4)", borderRadius:99}}/>
          </div>
          <div style={{marginTop:8, fontSize:13, color:"#fff", fontWeight:700}}>14 / 20 val.</div>
        </div>}/>
      <Fragment delay={14} fromX={2300} fromY={1200} x={1380} y={790} w={230} h={80}
        content={<div style={{color: COLORS.green, fontWeight:800, fontSize:18}}>✓ Patvirtinta</div>}/>
      <Fragment delay={18} fromX={-100} fromY={600} x={130} y={470} w={90} h={90} radius={999}
        color="linear-gradient(135deg,#e8734a,#c44a20)"
        content={<div style={{fontSize:30, color:"#fff", fontWeight:800}}>15h</div>}/>
      <Fragment delay={22} fromX={2100} fromY={500} x={1700} y={480} w={80} h={80} radius={20}
        content={<div style={{fontSize:32}}>◈</div>}/>
      <Fragment delay={26} fromX={800} fromY={-260} x={640} y={110} w={640} h={54} radius={999}
        color="rgba(15,20,36,0.9)"
        content={<div style={{fontSize:13, letterSpacing:2, color:"#c9d3e6", fontWeight:700}}>◆ LIETUVOS MOKSLEIVIAMS · NEMOKAMAI</div>}/>

      {/* Center logo */}
      <div style={{ position: "absolute", left: 960 - 65, top: 470, transform: `scale(${logoS})` }}>
        <div style={{
          width: 130, height: 130, borderRadius: 999,
          background: "linear-gradient(135deg,#67e8f9,#22b8d4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 30px 80px rgba(103,232,249,0.5)",
        }}><Heart size={64}/></div>
      </div>

      <div style={{
        position: "absolute", left: 0, right: 0, top: 640, textAlign: "center",
        opacity: tagOp, transform: `translateY(${tagY}px)`,
      }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 56, letterSpacing: -1 }}>
          <span style={{ color: "#fff" }}>Socialinės </span>
          <span style={{ color: COLORS.cyan }}>Valandos</span>
        </div>
        <div style={{
          marginTop: 20, fontFamily: "'Instrument Serif', serif", fontSize: 48, color: COLORS.muted, letterSpacing: -0.5,
        }}>
          Savanorystė <span style={{fontStyle:"italic", color: COLORS.orange}}>paprasčiau.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
