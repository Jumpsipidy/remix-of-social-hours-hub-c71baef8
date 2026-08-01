import { ACHIEVEMENTS } from "@/lib/achievements";
import { celebrate } from "@/lib/celebrate";
import { CLIP_URLS, STREAK_MILESTONES, clipForStreak } from "@/assets/celebrations";
import { CelebrationStage } from "@/components/celebration-overlay";
import { Flame, PartyPopper, Play } from "lucide-react";

/**
 * Super-admin sandbox: fires the real celebration overlay (MP4 clip + fallback)
 * so animations can be reviewed without earning anything.
 */
export function CelebrationSimulator() {
  return (
    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-fuchsia-500/5 to-transparent p-5 shadow-md sm:p-6">
      <CelebrationStage />

      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-300">
          <PartyPopper className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold sm:text-xl">Celebracijų simuliatorius</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Paspausk bet kurį ženklelį — pilno ekrano MP4 animacija paleidžiama iš karto (veikia ir telefone).
            Bakstelėk ekraną, kad uždarytum.
          </p>
        </div>
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Serijos</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STREAK_MILESTONES.slice().sort((a, b) => a - b).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => celebrate({ kind: "streak", days: d, longest: d })}
            className="group flex items-center gap-2 rounded-2xl border border-border bg-background/60 px-3 py-3 text-left transition active:scale-[0.97] hover:border-amber-400/60 hover:shadow-glow"
          >
            <Flame className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{d} d.</span>
            {clipForStreak(d) ? (
              <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-amber-300" />
            ) : (
              <span className="text-[9px] text-muted-foreground">fallback</span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Pasiekimai</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const Icon = a.icon;
          const hasClip = !!CLIP_URLS[a.key];
          return (
            <button
              key={a.key}
              type="button"
              onClick={() =>
                celebrate({ kind: "achievement", label: a.label, description: a.description, iconKey: a.key })
              }
              className="group flex items-center gap-2.5 rounded-2xl border border-border bg-background/60 px-3 py-3 text-left transition active:scale-[0.97] hover:border-primary/60 hover:shadow-glow"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{a.label}</span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">{a.key}</span>
              </span>
              {hasClip ? (
                <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
              ) : (
                <span className="shrink-0 text-[9px] text-muted-foreground">fallback</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
