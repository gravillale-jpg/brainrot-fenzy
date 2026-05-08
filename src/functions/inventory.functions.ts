import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Uid = z.object({ uid: z.string().uuid() });

export const getInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { doGetInventory } = await import("@/server/inventory.server");
    return doGetInventory(context.userId);
  });

export const equipBrainrot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Uid.parse(d))
  .handler(async ({ data, context }) => {
    const { doEquipBrainrot } = await import("@/server/inventory.server");
    return doEquipBrainrot(context.userId, data.uid);
  });

export const unequipBrainrot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { doUnequipBrainrot } = await import("@/server/inventory.server");
    return doUnequipBrainrot(context.userId);
  });

export const togglePet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ uid: z.string().uuid(), slot: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { doEquipPet } = await import("@/server/inventory.server");
    return doEquipPet(context.userId, data.uid, data.slot);
  });

export const sellBrainrot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Uid.parse(d))
  .handler(async ({ data, context }) => {
    const { doSellBrainrot } = await import("@/server/inventory.server");
    return doSellBrainrot(context.userId, data.uid);
  });

export const sellPet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Uid.parse(d))
  .handler(async ({ data, context }) => {
    const { doSellPet } = await import("@/server/inventory.server");
    return doSellPet(context.userId, data.uid);
  });
