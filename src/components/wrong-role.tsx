import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { PageShell } from "@/components/layout";

export const DASH_BY_ROLE: Record<string, string> = {
  student: "/student",
  organization: "/organization",
  school_admin: "/school",
  admin: "/admin",
};

/** Rodoma, kai prisijungęs vartotojas atidaro kitos rolės skydelį. */
export function WrongRole({ role }: { role: string }) {
  const navigate = useNavigate();
  const target = DASH_BY_ROLE[role] ?? "/";
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: target as never, replace: true }), 1600);
    return () => clearTimeout(t);
  }, [navigate, target]);
  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-destructive/12 text-destructive"><ShieldX className="h-8 w-8" /></span>
        <h1 className="mt-5 font-display text-3xl font-bold">Oops, tai ne tavo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Šis skydelis skirtas kitai rolei. Grąžiname tave į tavo skydelį…</p>
        <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-muted"><div className="sv-wrongrole-bar h-full bg-primary" /></div>
        <button type="button" onClick={() => navigate({ to: target as never, replace: true })} className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95">Eiti dabar</button>
      </div>
    </PageShell>
  );
}
