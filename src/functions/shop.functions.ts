import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { doGetShop } = await import("@/server/shop.server");
    return doGetShop(context.userId);
  });

export const buyShopItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        type: z.union([z.literal("brainrot"), z.literal("pet")]),
        slot: z.number().int().min(0).max(20),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { doBuyShopItem } = await import("@/server/shop.server");
    return doBuyShopItem(context.userId, data.type, data.slot);
  });
