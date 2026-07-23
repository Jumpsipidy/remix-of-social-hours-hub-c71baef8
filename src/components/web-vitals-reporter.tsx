import { useEffect } from "react";
import { initWebVitals } from "@/lib/web-vitals-reporter";

export function WebVitalsReporter() {
  useEffect(() => {
    // Delay a bit so it doesn't compete with LCP
    const t = setTimeout(() => initWebVitals(), 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
