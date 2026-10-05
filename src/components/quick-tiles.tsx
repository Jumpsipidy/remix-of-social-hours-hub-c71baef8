import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";

export type QuickTile = {
  label: string;
  value?: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  to?: string;
  onClick?: () => void;
  tone?: "primary" | "warning" | "default";
};

/** Greitos prieigos „bento“ juosta skydelių viršuje. */
export function QuickTiles({ tiles }: { tiles: QuickTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => {
        const tone = t.tone === "primary" ? "border-primary/40 bg-primary text-primary-foreground" : t.tone === "warning" ? "border-warning/40 bg-warning/10" : "border-border bg-card hover:border-primary/40";
        const inner = (
          <>
            <t.icon className={`h-5 w-5 ${t.tone === "primary" ? "" : "text-primary"}`} />
            {t.value !== undefined && <span className="mt-3 block font-display text-2xl font-bold tabular-nums leading-none">{t.value}</span>}
            <span className={`block text-sm font-semibold ${t.value === undefined ? "mt-3" : "mt-1"}`}>{t.label}</span>
            {t.hint && <span className={`block truncate text-xs ${t.tone === "primary" ? "opacity-80" : "text-muted-foreground"}`}>{t.hint}</span>}
          </>
        );
        const cls = `min-w-0 rounded-2xl border p-3.5 text-left transition active:scale-[0.98] ${tone}`;
        return t.to ? (
          <Link key={t.label} to={t.to as never} className={cls}>{inner}</Link>
        ) : (
          <button key={t.label} type="button" onClick={t.onClick} className={cls}>{inner}</button>
        );
      })}
    </div>
  );
}
