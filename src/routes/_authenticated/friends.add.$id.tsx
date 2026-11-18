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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) { setState("err"); setMsg("Nuoroda netinkama — paprašyk draugo atsiųsti ją dar kartą."); return; }
    sendFriendRequest(user.id, id)
      .then((outcome) => {
        setState("ok");
        setMsg(outcome === "accepted" ? "Jūs dabar draugai! Draugas jau buvo tave pakvietęs." : outcome === "already_friends" ? "Jūs jau esate draugai." : outcome === "already_sent" ? "Užklausa jau išsiųsta — laukiame draugo patvirtinimo." : "Užklausa išsiųsta! Kai draugas patvirtins, galėsite rezervuoti kartu.");
        setTimeout(() => navigate({ to: "/student" }), 2200);
      })
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
            {state === "busy" ? "Siunčiama draugystės užklausa…" : msg}
          </p>
        </motion.div>
      </div>
    </PageShell>
  );
}
