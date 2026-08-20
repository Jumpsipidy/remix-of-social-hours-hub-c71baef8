import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
  /** Pakopinis pasirodymas — 0..n, kad blokai „įsijungtų" bangomis. */
  delay?: number;
}

/**
 * Skeleton — CSS-only shimmer (jokių framer-motion mazgų kiekvienam blokui,
 * kad kraunantis skydelis nekainuotų dešimčių animacijos ciklų per kadrą).
 */
export function SkeletonLoader({ className, variant = "rect", delay = 0 }: SkeletonProps) {
  return (
    <div
      aria-hidden
      style={{ animationDelay: `${delay * 90}ms`, ["--sk-delay" as string]: `${delay * 90}ms` }}
      className={cn(
        "relative overflow-hidden border border-border/40 bg-muted/30",
        "animate-[skeleton-rise_.5s_both]",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.09] before:to-transparent",
        "before:animate-[skeleton-sweep_1.5s_infinite]",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-b after:from-foreground/[0.03] after:to-transparent",
        variant === "circle" ? "rounded-full" : variant === "text" ? "rounded-md" : "rounded-2xl",
        className,
      )}
    />
  );
}

/** Plona viršutinė progreso juostelė — rodo, kad kažkas realiai vyksta. */
export function LoadingBar({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("h-[2px] w-full overflow-hidden rounded-full bg-muted/40", className)}>
      <div className="h-full w-1/3 rounded-full bg-primary/70 animate-[skeleton-track_1.1s_ease-in-out_infinite]" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Kraunama">
      <LoadingBar />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonLoader variant="text" className="h-9 w-56" delay={0} />
          <SkeletonLoader variant="text" className="h-4 w-72" delay={1} />
        </div>
        <div className="flex gap-2">
          <SkeletonLoader className="h-9 w-28 rounded-full" delay={1} />
          <SkeletonLoader className="h-9 w-36 rounded-full" delay={2} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} className="h-28 w-full" delay={2 + i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <SkeletonLoader variant="text" className="h-5 w-48" delay={3} />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-20 w-full" delay={4 + i} />
          ))}
        </div>
        <div className="space-y-3">
          <SkeletonLoader className="h-40 w-full" delay={5} />
          <SkeletonLoader className="h-40 w-full" delay={6} />
        </div>
      </div>
      <span className="sr-only">Kraunama…</span>
    </div>
  );
}

/** Užduočių sąrašo / žemėlapio kortelių griaučiai. */
export function TasksSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Kraunamos užduotys">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4">
          <div className="flex items-center gap-3">
            <SkeletonLoader variant="circle" className="h-10 w-10" delay={i} />
            <div className="flex-1 space-y-2">
              <SkeletonLoader variant="text" className="h-4 w-2/3" delay={i} />
              <SkeletonLoader variant="text" className="h-3 w-1/3" delay={i + 1} />
            </div>
          </div>
          <SkeletonLoader variant="text" className="h-3 w-full" delay={i + 1} />
          <SkeletonLoader variant="text" className="h-3 w-4/5" delay={i + 2} />
          <SkeletonLoader className="h-9 w-full rounded-full" delay={i + 2} />
        </div>
      ))}
      <span className="sr-only">Kraunama…</span>
    </div>
  );
}
