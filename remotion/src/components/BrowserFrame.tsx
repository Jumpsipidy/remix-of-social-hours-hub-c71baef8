import { Img, staticFile } from "remotion";

export const BrowserFrame: React.FC<{
  src: string;
  width: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  scale?: number;
  rotateY?: number;
  rotateX?: number;
}> = ({ src, width, style, children, scale = 1, rotateY = 0, rotateX = 0 }) => {
  const height = Math.round(width * (740 / 1420));
  return (
    <div
      style={{
        width,
        borderRadius: 22,
        overflow: "hidden",
        background: "#0a0d1c",
        boxShadow:
          "0 40px 120px rgba(0,0,0,0.6), 0 8px 28px rgba(96,165,250,0.15), inset 0 0 0 1px rgba(148,163,184,0.18)",
        transform: `scale(${scale}) perspective(2000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      <div
        style={{
          height: 34,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
          background: "linear-gradient(180deg, #12172a, #0c1020)",
          borderBottom: "1px solid rgba(148,163,184,0.12)",
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#28c840" }} />
        <div
          style={{
            marginLeft: 20,
            flex: 1,
            maxWidth: 380,
            height: 20,
            borderRadius: 10,
            background: "rgba(148,163,184,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "#8b96ad",
            fontFamily: "Inter, sans-serif",
          }}
        >
          socialinesvalandos.lt
        </div>
      </div>
      <div style={{ position: "relative", width, height }}>
        <Img
          src={staticFile(src)}
          style={{ width, height, objectFit: "cover", display: "block" }}
        />
        {children}
      </div>
    </div>
  );
};
