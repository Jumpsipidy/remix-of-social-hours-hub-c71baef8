import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createLicensedTicket, runLicensedAdminAction, type LicensedOp } from "@/lib/admin-license.functions";

/** Starts a licence-protected Super Admin action: redirects to the secure auth site. */
export function useLicensedAction() {
  const create = useServerFn(createLicensedTicket);
  return async (op: LicensedOp, target: string, description: string) => {
    const returnUrl = window.location.origin + window.location.pathname;
    if (!/(^|\.)socialinesvalandos\.dev$/.test(window.location.hostname)) {
      toast.error("Šis veiksmas galimas tik socialinesvalandos.dev svetainėje (reikia licencijos patikros).");
      return false;
    }
    const t = toast.loading("Nukreipiame į saugumo patikrą…");
    try {
      const res = await create({ data: { op, target, description, returnUrl } });
      toast.message(`REF: ${res.ref}`, { id: t, description: "Paruošk licencijos raktą SVC-####-####-#" });
      setTimeout(() => { window.location.href = res.url; }, 800);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko sukurti patikros", { id: t });
      return false;
    }
  };
}

/** Mounted once in the admin layout: finishes the action after returning from the auth site. */
export function LicensedActionReturn() {
  const run = useServerFn(runLicensedAdminAction);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const sp = new URLSearchParams(window.location.search);
    const ticket = sp.get("ticket");
    const status = sp.get("status");
    if (!ticket || !status) return;
    done.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    if (status !== "confirmed") { toast.warning("Veiksmas atmestas"); return; }
    run({ data: { ticketId: ticket } })
      .then((r) => (r.ok ? toast.success(`Patvirtinta ✓ ${r.detail}`) : toast.error(r.reason)))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Nepavyko atlikti veiksmo"));
  }, [run]);
  return null;
}
