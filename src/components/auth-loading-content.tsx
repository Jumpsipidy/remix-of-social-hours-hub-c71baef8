/** Field geometry mirrors the corresponding form; no fake loading delays. */
export function AuthLoadingContent({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const block = "auth-loading-block rounded-lg";
  return <div data-skeleton="" role="status" aria-label={register ? "Kraunama registracija" : "Kraunamas prisijungimas"} aria-busy="true">
    <div aria-hidden="true">
      <div className={`${block} h-8 w-44`} /><div className={`${block} mt-2 h-4 w-3/4`} />
      {register && <div className="mt-6 grid grid-cols-2 gap-2"><div className={`${block} h-24`} /><div className={`${block} h-24`} /></div>}
      <div className="mt-6 grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className={`${block} h-12`} />)}</div>
      {!register && <div className={`${block} mt-3 h-5 w-3/4`} />}
      <div className="my-6 flex h-4 items-center gap-3"><div className="h-px flex-1 bg-border" /><div className={`${block} h-3 w-24`} /><div className="h-px flex-1 bg-border" /></div>
      <div className="space-y-4">{Array.from({ length: register ? 7 : 2 }, (_, i) => <div key={i}><div className={`${block} h-3 w-24`} /><div className={`${block} mt-1.5 ${register && i === 3 ? "h-28" : "h-11"} w-full`} /></div>)}</div>
      {register && <div className={`${block} mt-4 h-16 w-full`} />}
      <div className={`${block} mt-4 h-12 w-full`} />
      <div className={`${block} mx-auto mt-6 h-4 w-4/5`} /><div className={`${block} mx-auto mt-3 h-4 w-3/4`} />
    </div>
  </div>;
}
