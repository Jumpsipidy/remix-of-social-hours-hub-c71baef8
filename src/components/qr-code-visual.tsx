import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { SkeletonLoader } from "@/components/skeleton-loader";

/** Draw into a stable canvas: rotating tokens do not unmount or fade the QR. */
export function QrCodeVisual({ value }: { value: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const node = canvas.current;
    if (!node) return;
    const styles = getComputedStyle(document.documentElement);
    QRCode.toCanvas(node, value, {
      errorCorrectionLevel: "M", margin: 4, width: 512,
      color: { dark: styles.getPropertyValue("--qr-ink").trim() || "#000000", light: styles.getPropertyValue("--qr-paper").trim() || "#ffffff" },
    }).then(() => {
      // qrcode writes pixel-sized inline styles; keep its resolution, not its layout size.
      node.style.width = "100%";
      node.style.height = "100%";
      if (alive) { setReady(true); setFailed(false); }
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [value]);
  return <div className="qr-visual relative mx-auto aspect-square w-full max-w-72 overflow-hidden rounded-lg">
    <canvas ref={canvas} role="img" aria-label="Įsiregistravimo QR kodas" className={`h-full w-full ${ready && !failed ? "" : "invisible"}`} />
    {!ready && !failed && <SkeletonLoader className="absolute inset-0 h-full w-full" />}
    {failed && <p role="alert" className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-foreground">QR nepavyko paruošti. Naudok 6 skaitmenų kodą.</p>}
  </div>;
}
