import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { PageShell } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { sendFriendRequest } from "@/lib/friends";

export const Route = createFileRoute("/_authenticated/friends/add/$id")({
  head: () => ({
    meta: [
      { title: "Draugo pakvietimas — Socialinės Valandos" },
      { name: "description", content: "Priimk draugo pakvietimą ir eikite į savanorystę kartu." },
      { property: "og:title", content: "Draugo pakvietimas — Socialinės Valandos" },
      { property: "og:description", content: "Priimk pakvietimą ir rinkite valandas kartu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AddFriend,
});

function AddFriend() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"busy" | "ok" | "err">("busy");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role !== "student") { setState("err"); setMsg("Draugus gali pridėti tik mokiniai."); return; }
    if (user.id === id) { setState("err"); setMsg("Tai tavo paties nuoroda — nusiųsk ją draugui."); return; }
    sendFriendRequest(user.id, id)
      .then(() => { setState("ok"); setTimeout(() => navigate({ to: "/student" }), 1800); })
      .catch((e) => { setState("err"); setMsg(/duplicate|unique/i.test(e?.message ?? "") ? "Jau esate draugai arba užklausa išsiųsta." : (e?.message ?? "Nepavyko")); });
  }, [user, profile, id]);

  return (
    <PageShell>
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {state === "busy" && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
          {state === "ok" && <CheckCircle2 className="mx-auto h-12 w-12 text-success" />}
          {state === "err" && <XCircle className="mx-auto h-12 w-12 text-destructive" />}
          <h1 className="mt-4 flex items-center justify-center gap-2 text-2xl font-bold"><UserPlus className="h-5 w-5" /> Draugo pakvietimas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {state === "busy" ? "Siunčiama draugystės užklausa…" : state === "ok" ? "Užklausa išsiųsta! Kai draugas patvirtins, galėsite rezervuoti kartu." : msg}
          </p>
        </motion.div>
      </div>
    </PageShell>
  );
}
