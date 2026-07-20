import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

type Point = { x: number; y: number };

export const Cursor: React.FC<{
  path: Array<{ frame: number; pos: Point; click?: boolean }>;
  showFrom?: number;
  hideAt?: number;
}> = ({ path, showFrom = 0, hideAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < showFrom) return null;
  if (hideAt !== undefined && frame > hideAt) return null;

  let pos = path[0].pos;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const t = (frame - a.frame) / (b.frame - a.frame);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      pos = {
        x: a.pos.x + (b.pos.x - a.pos.x) * eased,
        y: a.pos.y + (b.pos.y - a.pos.y) * eased,
      };
      break;
    }
    if (frame > b.frame) pos = b.pos;
  }

  // Find nearest click event
  const clickEvent = path.find(
    (p) => p.click && frame >= p.frame && frame <= p.frame + 22,
  );
  const clickAge = clickEvent ? frame - clickEvent.frame : -1;
  const rippleScale = clickAge >= 0 ? interpolate(clickAge, [0, 22], [0.2, 2.4]) : 0;
  const rippleOpacity = clickAge >= 0 ? interpolate(clickAge, [0, 22], [0.7, 0]) : 0;

  const appearScale = spring({ frame: frame - showFrom, fps, config: { damping: 15 } });

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        transform: `translate(-6px, -4px) scale(${appearScale})`,
        pointerEvents: "none",
        zIndex: 100,
        filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.6))",
      }}
    >
      {rippleScale > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 60,
            height: 60,
            marginLeft: -30,
            marginTop: -30,
            borderRadius: "50%",
            border: "3px solid rgba(96,165,250,0.9)",
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
          }}
        />
      )}
      <svg width="34" height="40" viewBox="0 0 24 28">
        <path
          d="M2 2 L2 22 L7 17 L10.5 25 L13.5 24 L10 16 L17 16 Z"
          fill="#ffffff"
          stroke="#0a0d1c"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
