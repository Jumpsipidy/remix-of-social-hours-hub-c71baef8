import { motion } from "framer-motion";
import { ShieldAlert, Lock } from "lucide-react";
import { Captcha } from "./captcha";
import { useSecurityGateway } from "./security-gateway-provider";

/**
 * Renamed to Internal to avoid confusion during root mounting.
 * This component handles the actual blocking UI when useSecurityGateway() returns isBlocked.
 */
export function SecurityGatewayInternal() {
  const { isBlocked, pass } = useSecurityGateway();

  if (!isBlocked) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050915] px-4">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,hsl(var(--primary))_0%,transparent_70%)]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-md w-full rounded-[2.5rem] border border-white/10 bg-neutral-900/80 p-8 shadow-2xl backdrop-blur-2xl text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <Lock className="h-8 w-8 text-white" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-2">Saugumo patikra</h1>
        <p className="text-sm text-neutral-400 mb-8">
          Mums reikia patvirtinti, ar ne robotas. Paspauskite saugumo patikrą, kad galėtumėte tęsti į svetainę.
        </p>

        <div className="mb-8">
          <Captcha tone="dark" onVerify={() => pass()} />
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          <ShieldAlert className="h-3 w-3" />
          Apsaugota Socialinės Valandos
        </div>
      </motion.div>
    </div>
  );
}

// Keep the old export for backward compatibility if needed, but the root should use Internal
export const SecurityGateway = SecurityGatewayInternal;
