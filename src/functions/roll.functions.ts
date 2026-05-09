import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getRollInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { doGetRollInfo } = await import("@/server/roll.server");
    return doGetRollInfo(context.userId);
  });

export const rollBrainrot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ keep: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { doRollBrainrot } = await import("@/server/roll.server");
    return doRollBrainrot(context.userId, data.keep);
  });