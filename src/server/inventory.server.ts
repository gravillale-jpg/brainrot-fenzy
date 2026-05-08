import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Rarity } from "@/lib/rarity";

export type InvBrainrot = {
  uid: string; // user_brainrots.id
  brainrot_id: string;
  name: string;
  rarity: Rarity;
  image_url: string | null;
  base_click: number;
  base_passive: number;
  sell_price: number;
  theme_set: string | null;
  rolls_used: number;
  modifiers: Array<{ type: string; mult: number }>;
  equipped: boolean;
};

export type InvPet = {
  uid: string;
  pet_id: string;
  name: string;
  rarity: Rarity;
  image_url: string | null;
  click_bonus: number;
  passive_bonus: number;
  luck_bonus: number;
  quest_bonus: number;
  sell_price: number;
  theme_set: string | null;
  equipped_slot: 1 | 2 | 3 | null;
};

export async function doGetInventory(userId: string) {
  const [{ data: ld }, { data: ubs }, { data: ups }] = await Promise.all([
    supabaseAdmin
      .from("user_loadout")
      .select("equipped_brainrot, pet_slot_1, pet_slot_2, pet_slot_3")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_brainrots")
      .select("id, brainrot_id, modifiers, rolls_used, acquired_at")
      .eq("user_id", userId),
    supabaseAdmin
      .from("user_pets")
      .select("id, pet_id, acquired_at")
      .eq("user_id", userId),
  ]);

  const brainrotIds = Array.from(new Set((ubs ?? []).map((u) => u.brainrot_id)));
  const petIds = Array.from(new Set((ups ?? []).map((u) => u.pet_id)));

  const [{ data: bcat }, { data: pcat }] = await Promise.all([
    brainrotIds.length
      ? supabaseAdmin
          .from("brainrots_catalog")
          .select("id, name, rarity, image_url, base_click, base_passive, sell_price, theme_set")
          .in("id", brainrotIds)
      : Promise.resolve({ data: [] as never[] }),
    petIds.length
      ? supabaseAdmin
          .from("pets_catalog")
          .select(
            "id, name, rarity, image_url, click_bonus, passive_bonus, luck_bonus, quest_bonus, sell_price, theme_set"
          )
          .in("id", petIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const bMap = new Map((bcat ?? []).map((c) => [c.id, c]));
  const pMap = new Map((pcat ?? []).map((c) => [c.id, c]));

  const brainrots: InvBrainrot[] = (ubs ?? [])
    .map((u): InvBrainrot | null => {
      const c = bMap.get(u.brainrot_id);
      if (!c) return null;
      return {
        uid: u.id,
        brainrot_id: u.brainrot_id,
        name: c.name,
        rarity: c.rarity as Rarity,
        image_url: c.image_url,
        base_click: Number(c.base_click),
        base_passive: Number(c.base_passive),
        sell_price: Number(c.sell_price),
        theme_set: c.theme_set,
        rolls_used: u.rolls_used ?? 0,
        modifiers: Array.isArray(u.modifiers)
          ? (u.modifiers as Array<{ type: string; mult: number }>)
          : [],
        equipped: ld?.equipped_brainrot === u.id,
      };
    })
    .filter((x): x is InvBrainrot => !!x);

  const pets: InvPet[] = (ups ?? [])
    .map((u): InvPet | null => {
      const c = pMap.get(u.pet_id);
      if (!c) return null;
      const slot: 1 | 2 | 3 | null =
        ld?.pet_slot_1 === u.id ? 1 : ld?.pet_slot_2 === u.id ? 2 : ld?.pet_slot_3 === u.id ? 3 : null;
      return {
        uid: u.id,
        pet_id: u.pet_id,
        name: c.name,
        rarity: c.rarity as Rarity,
        image_url: c.image_url,
        click_bonus: Number(c.click_bonus),
        passive_bonus: Number(c.passive_bonus),
        luck_bonus: Number(c.luck_bonus),
        quest_bonus: Number(c.quest_bonus),
        sell_price: Number(c.sell_price),
        theme_set: c.theme_set,
        equipped_slot: slot,
      };
    })
    .filter((x): x is InvPet => !!x);

  return { brainrots, pets };
}

async function ensureLoadout(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_loadout")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) await supabaseAdmin.from("user_loadout").insert({ user_id: userId });
}

async function ownsBrainrot(userId: string, uid: string) {
  const { data } = await supabaseAdmin
    .from("user_brainrots")
    .select("id")
    .eq("id", uid)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

async function ownsPet(userId: string, uid: string) {
  const { data } = await supabaseAdmin
    .from("user_pets")
    .select("id")
    .eq("id", uid)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function doEquipBrainrot(userId: string, uid: string) {
  if (!(await ownsBrainrot(userId, uid))) throw new Error("not_owned");
  await ensureLoadout(userId);
  await supabaseAdmin
    .from("user_loadout")
    .update({ equipped_brainrot: uid, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return { ok: true };
}

export async function doUnequipBrainrot(userId: string) {
  await ensureLoadout(userId);
  await supabaseAdmin
    .from("user_loadout")
    .update({ equipped_brainrot: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return { ok: true };
}

export async function doEquipPet(userId: string, uid: string, slot?: 1 | 2 | 3) {
  if (!(await ownsPet(userId, uid))) throw new Error("not_owned");
  await ensureLoadout(userId);
  const { data: ld } = await supabaseAdmin
    .from("user_loadout")
    .select("pet_slot_1, pet_slot_2, pet_slot_3")
    .eq("user_id", userId)
    .maybeSingle();
  if (!ld) throw new Error("no_loadout");

  const now = new Date().toISOString();
  // Already equipped → unequip
  if (ld.pet_slot_1 === uid || ld.pet_slot_2 === uid || ld.pet_slot_3 === uid) {
    await supabaseAdmin
      .from("user_loadout")
      .update({
        pet_slot_1: ld.pet_slot_1 === uid ? null : ld.pet_slot_1,
        pet_slot_2: ld.pet_slot_2 === uid ? null : ld.pet_slot_2,
        pet_slot_3: ld.pet_slot_3 === uid ? null : ld.pet_slot_3,
        updated_at: now,
      })
      .eq("user_id", userId);
    return { ok: true, action: "unequipped" as const };
  }

  let target: 1 | 2 | 3 = slot ?? 1;
  if (!slot) {
    if (!ld.pet_slot_1) target = 1;
    else if (!ld.pet_slot_2) target = 2;
    else if (!ld.pet_slot_3) target = 3;
    else target = 1;
  }
  const patch =
    target === 1
      ? { pet_slot_1: uid, updated_at: now }
      : target === 2
        ? { pet_slot_2: uid, updated_at: now }
        : { pet_slot_3: uid, updated_at: now };
  await supabaseAdmin.from("user_loadout").update(patch).eq("user_id", userId);
  return { ok: true, action: "equipped" as const, slot: target };
}

export async function doSellBrainrot(userId: string, uid: string) {
  if (!(await ownsBrainrot(userId, uid))) throw new Error("not_owned");
  // can't sell equipped
  const { data: ld } = await supabaseAdmin
    .from("user_loadout")
    .select("equipped_brainrot")
    .eq("user_id", userId)
    .maybeSingle();
  if (ld?.equipped_brainrot === uid) throw new Error("equipped");

  const { data: row } = await supabaseAdmin
    .from("user_brainrots")
    .select("brainrot_id")
    .eq("id", uid)
    .maybeSingle();
  if (!row) throw new Error("not_found");
  const { data: cat } = await supabaseAdmin
    .from("brainrots_catalog")
    .select("sell_price")
    .eq("id", row.brainrot_id)
    .maybeSingle();
  const refund = Number(cat?.sell_price ?? 0);

  await supabaseAdmin.from("user_brainrots").delete().eq("id", uid);
  const { data: state } = await supabaseAdmin
    .from("user_state")
    .select("btoken")
    .eq("user_id", userId)
    .maybeSingle();
  const newBalance = Number(state?.btoken ?? 0) + refund;
  await supabaseAdmin.from("user_state").update({ btoken: newBalance }).eq("user_id", userId);

  return { ok: true, refund, btoken: newBalance };
}

export async function doSellPet(userId: string, uid: string) {
  if (!(await ownsPet(userId, uid))) throw new Error("not_owned");
  const { data: ld } = await supabaseAdmin
    .from("user_loadout")
    .select("pet_slot_1, pet_slot_2, pet_slot_3")
    .eq("user_id", userId)
    .maybeSingle();
  if (ld && (ld.pet_slot_1 === uid || ld.pet_slot_2 === uid || ld.pet_slot_3 === uid)) {
    throw new Error("equipped");
  }

  const { data: row } = await supabaseAdmin
    .from("user_pets")
    .select("pet_id")
    .eq("id", uid)
    .maybeSingle();
  if (!row) throw new Error("not_found");
  const { data: cat } = await supabaseAdmin
    .from("pets_catalog")
    .select("sell_price")
    .eq("id", row.pet_id)
    .maybeSingle();
  const refund = Number(cat?.sell_price ?? 0);

  await supabaseAdmin.from("user_pets").delete().eq("id", uid);
  const { data: state } = await supabaseAdmin
    .from("user_state")
    .select("btoken")
    .eq("user_id", userId)
    .maybeSingle();
  const newBalance = Number(state?.btoken ?? 0) + refund;
  await supabaseAdmin.from("user_state").update({ btoken: newBalance }).eq("user_id", userId);

  return { ok: true, refund, btoken: newBalance };
}
