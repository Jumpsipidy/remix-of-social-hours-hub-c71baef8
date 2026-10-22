import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public-only client: status must not wait for the visitor's session refresh.
const publicClient = createClient<Database>(
  "https://bacqlmhfokfnmoexijkj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3FsbWhmb2tmbm1vZXhpamtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTQ2NjksImV4cCI6MjA5ODkzMDY2OX0.pSux_xc0a82WR3LLHkHX7-wAfXT4pHeBItV2XK1b6sM",
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

export function readPublicLockdown() {
  return publicClient.rpc("get_lockdown_public").abortSignal(AbortSignal.timeout(5000));
}