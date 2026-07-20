import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { COLORS, Heart } from "../ui/primitives";

// Interface fragments assemble from all directions into a centered logo mark.
const Fragment: React.FC<{
  delay: number;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  radius?: number;
  content?: React.ReactNode;
}> = ({ delay, fromX, fromY, x, y, w, h, color = COLORS.panel, radius = 14, content }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
  const cx = fromX + (x - fromX) * s;
  const cy = fromY + (y - fromY) * s;
  const opacity = interpolate(s, [0, 0.3], [0, 1]);
  const rot = interpolate(s, [0, 1], [-8, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        width: w,
        height: h,
        borderRadius: radius,
        background: color,
        border: `1px solid ${COLORS.borderStrong}`,
        opacity,
        transform: `rotate(${rot}deg)`,
        boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {content}
    </div>
  );
};

export const SceneOpening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame: frame - 55, fps, config: { damping: 14, stiffness: 100 } });
  const nameOp = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: "clamp" });
  const nameY = interpolate(frame, [80, 110], [16, 0], { extrapolateRight: "clamp" });
  const cx = 960;
  const cy = 500;
  return (
    <AbsoluteFill>
      {/* Fragments flying in from edges */}
      <Fragment delay={0}  fromX={-260} fromY={-160} x={340} y={220} w={220} h={80} content={<div style={{color: COLORS.cyan, fontWeight:700, fontSize:14, letterSpacing:1}}>◆ AKTYVIOS</div>} />
      <Fragment delay={4}  fromX={2200} fromY={-100} x={1380} y={190} w={260} h={100} content={<div style={{textAlign:"center"}}><div style={{fontSize:11, color: COLORS.muted, letterSpacing:1.5}}>VALANDOS</div><div style={{fontSize:28, fontWeight:800, color:"#fff"}}>48,320</div></div>} />
      <Fragment delay={8}  fromX={-200} fromY={1300} x={280} y={780} w={340} h={120} color={COLORS.panel2} content={<div style={{width:"85%"}}><div style={{height:6, background: COLORS.border, borderRadius:99}}><div style={{width:"70%", height:"100%", background:"linear-gradient(90deg,#67e8f9,#22b8d4)", borderRadius:99}}/></div><div style={{marginTop:10, fontSize:12, color: COLORS.muted}}>Pažangos rodiklis</div></div>} />
      <Fragment delay={12} fromX={2300} fromY={1200} x={1360} y={800} w={220} h={90} content={<div style={{color: COLORS.orange, fontWeight:800, fontSize:22}}>✓ Patvirtinta</div>} />
      <Fragment delay={16} fromX={-100} fromY={600} x={140} y={470} w={90} h={90} radius={999} color="linear-gradient(135deg,#e8734a,#c44a20)" content={<div style={{fontSize:32, color:"#fff", fontWeight:800}}>15h</div>} />
      <Fragment delay={20} fromX={2100} fromY={500} x={1680} y={480} w={80} h={80} radius={20} color={COLORS.panel} content={<div style={{fontSize:34}}>◈</div>} />
      <Fragment delay={24} fromX={800} fromY={-260} x={720} y={130} w={480} h={60} radius={999} color="rgba(15,20,36,0.9)" content={<div style={{fontSize:13, letterSpacing:2, color:"#c9d3e6", fontWeight:700}}>◆ LIETUVOS MOKSLEIVIAMS · NEMOKAMAI</div>} />
      <Fragment delay={28} fromX={600} fromY={1300} x={820} y={860} w={280} h={70} radius={16} color="linear-gradient(135deg,#e8734a,#c44a20)" content={<div style={{color:"#fff", fontWeight:700, fontSize:16}}>Pradėti savanorystę →</div>} />

      {/* Center logo mark */}
      <div style={{ position: "absolute", left: cx - 70, top: cy - 70, transform: `scale(${logoS})` }}>
        <div style={{
          width: 140, height: 140, borderRadius: 999,
          background: "linear-gradient(135deg,#67e8f9,#22b8d4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 30px 80px rgba(103,232,249,0.5)",
        }}>
          <Heart size={68} />
        </div>
      </div>

      <div style={{
        position: "absolute", left: 0, right: 0, top: cy + 100,
        textAlign: "center", opacity: nameOp, transform: `translateY(${nameY}px)`,
      }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 64, letterSpacing: -1 }}>
          <span style={{ color: "#fff" }}>Socialinės </span>
          <span style={{ color: COLORS.cyan }}>Valandos</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
