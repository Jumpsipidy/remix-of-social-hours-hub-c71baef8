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
      data-skeleton=""
      style={{ ["--sk-delay" as string]: `${Math.min(delay, 6) * 40}ms` }}
      className={cn(
        "sv-skeleton",
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
    <div className="space-y-6 sm:space-y-8" role="status" aria-label="Kraunama">
      <LoadingBar />
      {/* Header: phones get a compact avatar + title row and one full-width button */}
      <div className="flex items-center gap-3">
        <SkeletonLoader className="h-11 w-11 shrink-0 rounded-xl" delay={0} />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLoader variant="text" className="h-3 w-24" delay={0} />
          <SkeletonLoader variant="text" className="h-6 w-full max-w-56" delay={1} />
        </div>
        <SkeletonLoader className="hidden h-9 w-40 rounded-lg sm:block" delay={1} />
      </div>
      <SkeletonLoader className="h-10 w-full rounded-lg sm:hidden" delay={1} />
      <StatSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <SkeletonLoader variant="text" className="h-5 w-40" delay={3} />
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} className="h-16 w-full sm:h-20" delay={4 + i} />
          ))}
        </div>
        <div className="hidden space-y-3 lg:block">
          <SkeletonLoader className="h-40 w-full" delay={5} />
          <SkeletonLoader className="h-40 w-full" delay={6} />
        </div>
      </div>
      <span className="sr-only">Kraunama…</span>
    </div>
  );
}

/** Skaičių kortelės: telefone 2 stulpeliai, žemesnės. */
export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-3 sm:p-4">
          <SkeletonLoader variant="text" className="h-3 w-2/3" delay={i} />
          <SkeletonLoader variant="text" className="h-7 w-1/2" delay={i + 1} />
        </div>
      ))}
    </div>
  );
}

/** Pokalbių sąrašas + žinutės. Telefone — tik sąrašas. */
export function ChatSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]" role="status" aria-label="Kraunami pokalbiai">
      <ListSkeleton rows={6} />
      <div className="hidden space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4 md:block">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
            <SkeletonLoader className="h-10 w-1/2 rounded-2xl" delay={i} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MessageThreadSkeleton() {
  return <div role="status" aria-label="Kraunamos žinutės" className="space-y-4 p-3">
    {["w-3/4", "ml-auto w-1/2", "w-2/3", "ml-auto w-3/4"].map((width, i) => (
      <SkeletonLoader key={i} className={cn("h-16 rounded-lg", width)} delay={i} />
    ))}
  </div>;
}

export function CheckinSkeleton() {
  return <div role="status" aria-label="Kraunamas QR kodas" className="mx-auto grid max-w-3xl gap-5 rounded-lg border border-border bg-card p-4 sm:grid-cols-[256px_minmax(0,1fr)] sm:p-6">
    <SkeletonLoader className="mx-auto aspect-square w-full max-w-64 rounded-lg" />
    <div className="min-w-0 space-y-4">
      <SkeletonLoader className="h-5 w-2/3" />
      <SkeletonLoader className="h-4 w-full" />
      <SkeletonLoader className="h-20 w-full" />
      <SkeletonLoader className="h-11 w-full" />
    </div>
  </div>;
}

/** Žemėlapio vieta: telefone žemesnė, kad tilptų sąrašas. */
export function MapSkeleton({ className }: { className?: string }) {
  return <SkeletonLoader className={cn("h-64 w-full sm:h-[420px]", className)} />;
}

/** Pažymėjimo / patikros kortelė. */
export function CertificateSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-border/50 bg-card/40 p-5" role="status" aria-label="Tikrinama">
      <SkeletonLoader variant="circle" className="mx-auto h-14 w-14" />
      <SkeletonLoader variant="text" className="mx-auto h-5 w-2/3" delay={1} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex justify-between gap-4">
          <SkeletonLoader variant="text" className="h-3.5 w-1/3" delay={i + 2} />
          <SkeletonLoader variant="text" className="h-3.5 w-1/3" delay={i + 2} />
        </div>
      ))}
    </div>
  );
}

/** Užduočių sąrašo / žemėlapio kortelių griaučiai. */
export function TasksSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" role="status" aria-label="Kraunamos užduotys">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("space-y-3 rounded-2xl border border-border/50 bg-card/40 p-4", i >= 3 && "hidden sm:block")}>
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

/** Lentelės eilučių griaučiai — naudoti vietoj „Kraunama…" teksto. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border/40">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-3">
              <SkeletonLoader variant="text" className="h-3.5 w-full" delay={r + c} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Kortelių/įrašų sąrašo griaučiai. */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Kraunama">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/40 p-4">
          <SkeletonLoader variant="circle" className="h-10 w-10" delay={i} />
          <div className="flex-1 space-y-2">
            <SkeletonLoader variant="text" className="h-3.5 w-1/2" delay={i} />
            <SkeletonLoader variant="text" className="h-3 w-1/3" delay={i + 1} />
          </div>
          <SkeletonLoader className="h-8 w-20 rounded-full" delay={i + 1} />
        </div>
      ))}
      <span className="sr-only">Kraunama…</span>
    </div>
  );
}

/** Profilio / viešo puslapio griaučiai. */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10" role="status" aria-label="Kraunama">
      <LoadingBar />
      <SkeletonLoader className="h-48 w-full" delay={0} />
      <div className="flex items-center gap-4">
        <SkeletonLoader variant="circle" className="h-20 w-20" delay={1} />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" className="h-6 w-64" delay={1} />
          <SkeletonLoader variant="text" className="h-4 w-40" delay={2} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonLoader key={i} className="h-28 w-full" delay={3 + i} />
        ))}
      </div>
      <span className="sr-only">Kraunama…</span>
    </div>
  );
}
