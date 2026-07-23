import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, Trophy, Rocket, Award, Building2, Flame, Users, Heart, Sparkles, Calendar, Target, Medal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Achievement = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  check: (ctx: AchievementCtx) => boolean;
};

export type AchievementCtx = {
  hoursEarned: number;
  hoursNeeded: number;
  completedCount: number;
  uniqueOrgs: number;
  streakWeeks: number;
  friendsCount: number;
  groupJoined: number;
  loginStreakDays?: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  { key: "first_hour", label: "Pirmoji valanda", description: "Užbaigei pirmąją socialinę valandą.", icon: Star, check: (c) => c.hoursEarned >= 1 },
  { key: "five_hours", label: "5 valandos", description: "Surinkai 5 valandas.", icon: Sparkles, check: (c) => c.hoursEarned >= 5 },
  { key: "ten_hours", label: "10 valandų", description: "Dviženklis skaičius! 🎯", icon: Trophy, check: (c) => c.hoursEarned >= 10 },
  { key: "half_way", label: "Pusiaukelė", description: "Įveikei 50% metinio tikslo.", icon: Rocket, check: (c) => c.hoursNeeded > 0 && c.hoursEarned / c.hoursNeeded >= 0.5 },
  { key: "goal_reached", label: "Tikslas pasiektas", description: "100% metinių valandų — nuostabu!", icon: Award, check: (c) => c.hoursNeeded > 0 && c.hoursEarned >= c.hoursNeeded },
  { key: "overachiever", label: "Perviršininkas", description: "150% nuo tikslo. Nesustabdomas.", icon: Medal, check: (c) => c.hoursNeeded > 0 && c.hoursEarned / c.hoursNeeded >= 1.5 },
  { key: "three_orgs", label: "3 organizacijos", description: "Savanoriavai trijose skirtingose vietose.", icon: Building2, check: (c) => c.uniqueOrgs >= 3 },
  { key: "five_orgs", label: "5 organizacijos", description: "Tikras keliautojas — 5 organizacijos.", icon: Target, check: (c) => c.uniqueOrgs >= 5 },
  { key: "streak_2", label: "2 sav. iš eilės", description: "Dvi savaites paeiliui su valandomis.", icon: Flame, check: (c) => c.streakWeeks >= 2 },
  { key: "streak_4", label: "Mėnesio ritmas", description: "4 savaitės iš eilės.", icon: Flame, check: (c) => c.streakWeeks >= 4 },
  { key: "social_starter", label: "Pirmasis draugas", description: "Susirado bent vieną draugą.", icon: Heart, check: (c) => c.friendsCount >= 1 },
  { key: "squad", label: "Klasės būrys", description: "5 draugai mokykloje.", icon: Users, check: (c) => c.friendsCount >= 5 },
  { key: "team_player", label: "Komandinis žaidėjas", description: "Prisijungė prie grupinės rezervacijos.", icon: Users, check: (c) => c.groupJoined >= 1 },
  { key: "ten_tasks", label: "10 užbaigtų vizitų", description: "Užbaigei 10 skirtingų užduočių.", icon: Calendar, check: (c) => c.completedCount >= 10 },
];

/** Compares computed unlocks to DB, inserts new ones, toasts. */
export async function syncAchievements(userId: string, ctx: AchievementCtx): Promise<Set<string>> {
  const unlockedNow = new Set(ACHIEVEMENTS.filter((a) => a.check(ctx)).map((a) => a.key));
  try {
    const { data } = await supabase.from("user_achievements").select("key").eq("user_id", userId);
    const already = new Set(((data as { key: string }[] | null) ?? []).map((r) => r.key));
    const newly = [...unlockedNow].filter((k) => !already.has(k));
    if (newly.length) {
      await supabase.from("user_achievements").insert(newly.map((k) => ({ user_id: userId, key: k })) as any);
      newly.forEach((k) => {
        const a = ACHIEVEMENTS.find((x) => x.key === k);
        if (a) toast.success(`🏆 Atrakintas pasiekimas: ${a.label}`, { description: a.description, duration: 5000 });
      });
    }
    return new Set([...already, ...unlockedNow]);
  } catch {
    return unlockedNow;
  }
}
