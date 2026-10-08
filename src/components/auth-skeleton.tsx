import { Heart } from "lucide-react";

/** Lightweight pending UI: no auth requests, timers or interactive controls. */
export function AuthSkeleton({ mode = "login" }: { mode?: "login" | "register" }) {
  const register = mode === "register";
  return (
    <div className="auth-shell auth-loading min-h-screen bg-background text-foreground" role="status" aria-label={register ? "Kraunama registracija" : "Kraunamas prisijungimas"} aria-busy="true">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 pb-8 pt-20 sm:px-6">
        <div className={`grid w-full overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 lg:grid-cols-[1fr_1.1fr] ${register ? "lg:[direction:rtl]" : ""}`}>
          <aside aria-hidden="true" className="hidden flex-col justify-between bg-gradient-primary p-10 text-primary-foreground [direction:ltr] lg:flex">
            <div className="flex items-center gap-2"><Heart className="h-10 w-10" /><span className="text-xl font-bold">Socialinės Valandos</span></div>
            <div className="space-y-5">
              <div className="h-3 w-32 rounded bg-primary-foreground/20" />
              <div className="h-12 w-4/5 rounded bg-primary-foreground/20" />
              <div className="h-12 w-3/4 rounded bg-primary-foreground/20" />
              <div className="h-12 w-full rounded bg-primary-foreground/15" />
              <div className="space-y-3 pt-3">{[0, 1, 2].map(i => <div key={i} className="h-8 w-4/5 rounded bg-primary-foreground/15" />)}</div>
            </div>
            <div className="h-3 w-20 rounded bg-primary-foreground/20" />
          </aside>
          <div aria-hidden="true" className="p-6 [direction:ltr] sm:p-10">
            <div className="mb-6 flex items-center gap-2 lg:hidden"><Heart className="h-9 w-9 text-primary" /><span className="text-lg font-bold">Socialinės Valandos</span></div>
            <div className="auth-loading-block h-11 w-full rounded-full" />
            <div className="mt-6 space-y-4">
              <div className="auth-loading-block h-8 w-40 rounded" />
              <div className="auth-loading-block h-4 w-3/4 rounded" />
              {register && <div className="grid grid-cols-2 gap-2 pt-2"><div className="auth-loading-block h-20 rounded-2xl" /><div className="auth-loading-block h-20 rounded-2xl" /></div>}
              <div className="grid grid-cols-3 gap-2 pt-2">{[0, 1, 2].map(i => <div key={i} className="auth-loading-block h-11 rounded-xl" />)}</div>
              <div className="flex h-12 items-center"><div className="h-px w-full bg-border" /></div>
              {Array.from({ length: register ? 7 : 2 }, (_, i) => <div key={i} className="space-y-2"><div className="auth-loading-block h-3 w-20 rounded" /><div className="auth-loading-block h-11 w-full rounded-xl" /></div>)}
              <div className="h-12 w-full rounded-xl bg-primary/35" />
              <div className="auth-loading-block mx-auto h-3 w-4/5 rounded" />
              <div className="auth-loading-block mx-auto h-3 w-3/4 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}