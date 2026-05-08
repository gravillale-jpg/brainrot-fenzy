import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const processClicks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ count: z.number().int().min(1).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { doProcessClicks } = await import("@/server/game.server");
    return doProcessClicks(context.userId, data.count);
  });

export const getDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { doGetDashboard } = await import("@/server/game.server");
    return doGetDashboard(context.userId);
  });
