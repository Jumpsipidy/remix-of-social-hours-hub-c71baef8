import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
}

/**
 * Skeleton — CSS-only shimmer (jokių framer-motion mazgų kiekvienam blokui,
 * kad kraunantis skydelis nekainuotų dešimčių animacijos ciklų per kadrą).
 */
export function SkeletonLoader({ className, variant = "rect" }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden bg-muted/40",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.07] before:to-transparent",
        "before:animate-[skeleton-sweep_1.6s_infinite]",
        variant === "circle" ? "rounded-full" : variant === "text" ? "rounded-md" : "rounded-2xl",
        className,
      )}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Kraunama">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonLoader variant="text" className="h-9 w-56" />
          <SkeletonLoader variant="text" className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <SkeletonLoader className="h-9 w-28 rounded-full" />
          <SkeletonLoader className="h-9 w-36 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <SkeletonLoader variant="text" className="h-5 w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-20 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          <SkeletonLoader className="h-40 w-full" />
          <SkeletonLoader className="h-40 w-full" />
        </div>
      </div>
      <span className="sr-only">Kraunama…</span>
    </div>
  );
}
