/** Field geometry mirrors the corresponding form; no fake loading delays. */
export function AuthLoadingContent({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const b = "auth-loading-block rounded-lg";
  const field = (key: string | number, tall = false) => (
    <div key={key}>
      <div className={`${b} h-3 w-24`} />
      <div className={`${b} mt-2 ${tall ? "h-24" : "h-12"} w-full rounded-xl`} />
    </div>
  );
  return (
    <div data-skeleton="" className="auth-skeleton" role="status" aria-label={register ? "Kraunama registracija" : "Kraunamas prisijungimas"} aria-busy="true">
      <div aria-hidden="true">
        <div className={`${b} h-8 w-48`} />
        <div className={`${b} mt-2.5 h-4 w-64 max-w-full`} />
        {register && <div className="mt-6 grid grid-cols-2 gap-2"><div className={`${b} h-[76px] rounded-2xl`} /><div className={`${b} h-[76px] rounded-2xl`} /></div>}
        <div className="mt-6 grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className={`${b} h-11 rounded-xl`} />)}</div>
        {!register && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className={`${b} h-6 w-20 rounded-full`} />)}</div>
            <div className={`${b} h-3 w-36`} />
          </div>
        )}
        <div className="my-6 flex h-4 items-center gap-3"><div className="h-px flex-1 bg-border" /><div className={`${b} h-3 w-24`} /><div className="h-px flex-1 bg-border" /></div>
        {register ? (
          <div className="space-y-6">
            <div className="space-y-4"><div className={`${b} h-3 w-28`} />{field("n")}</div>
            <div className="space-y-4"><div className={`${b} h-3 w-36`} />{field("s")}<div className="grid grid-cols-2 gap-3">{field("c")}{field("h")}</div>{field("k")}</div>
            <div className="space-y-4"><div className={`${b} h-3 w-32`} />{field("e")}{field("p")}</div>
            <div className={`${b} h-14 w-full rounded-xl`} />
          </div>
        ) : (
          <div className="space-y-4">{field("e")}{field("p")}</div>
        )}
        <div className={`${b} mt-5 h-12 w-full rounded-xl`} />
        <div className={`${b} mx-auto mt-6 h-3 w-4/5`} />
        <div className={`${b} mx-auto mt-2.5 h-3 w-3/5`} />
      </div>
    </div>
  );
}
