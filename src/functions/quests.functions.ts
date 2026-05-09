import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getQuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { doGetQuests } = await import("@/server/quests.server");
    return doGetQuests(context.userId);
  });

export const claimQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quest_id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { doClaimQuest } = await import("@/server/quests.server");
    return doClaimQuest(context.userId, data.quest_id);
  });

export const getStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { doGetStats } = await import("@/server/quests.server");
    return doGetStats(context.userId);
  });

export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { doGetLeaderboard } = await import("@/server/quests.server");
    return doGetLeaderboard(100);
  });
