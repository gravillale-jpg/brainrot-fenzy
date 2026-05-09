import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Rarity } from "@/lib/rarity";
import { loadLoadout } from "@/server/game.server";
import { bumpQuestProgress } from "@/server/quests.server";

export type RollMod = { type: "click" | "passive" | "both"; mult: number; tier: ModTier };
export type ModTier = "weak" | "common" | "strong" | "mythic" | "godly" | "divine";

const TIER_RANGES: Record<ModTier, [number, number]> = {
  weak: [1.05, 1.15],
  common: [1.15, 1.3],
  strong: [1.3, 1.6],
  mythic: [1.6, 2.5],
  godly: [2.5, 5.0],
  divine: [5.0, 8.0],
};

// Base tier weights per brainrot rarity. Higher rarity → better tier odds.
const TIER_WEIGHTS: Record<Rarity, Record<ModTier, number>> = {
  common:    { weak: 60, common: 30, strong: 8,  mythic: 1.8, godly: 0.18, divine: 0.02 },
  uncommon:  { weak: 45, common: 35, strong: 15, mythic: 4.0, godly: 0.9,  divine: 0.1 },
  rare:      { weak: 30, common: 35, strong: 25, mythic: 8.0, godly: 1.8,  divine: 0.2 },
  epic:      { weak: 18, common: 32, strong: 32, mythic: 13,  godly: 4.5,  divine: 0.5 },
  mythic:    { weak: 10, common: 25, strong: 35, mythic: 20,  godly: 8.0,  divine: 2.0 },
  legendary: { weak: 5,  common: 18, strong: 35, mythic: 25,  godly: 13,   divine: 4.0 },
  secret:    { weak: 2,  common: 10, strong: 28, mythic: 30,  godly: 22,   divine: 8.0 },
};

const FREE_ROLLS = 3;
const RARITY_COST_MULT: Record<Rarity, number> = {
  common: 0.4, uncommon: 0.6, rare: 0.9, epic: 1.4, mythic: 2.0, legendary: 3.0, secret: 5.0,
};

function rollCost(basePrice: number, rarity: Rarity, rollsUsed: number): number {
  if (rollsUsed < FREE_ROLLS) return 0;
  const n = rollsUsed - FREE_ROLLS;
  const base = Math.max(50, basePrice * RARITY_COST_MULT[rarity] * 0.35);
  return Math.floor(base * Math.pow(1.55, n));
}

function pickWeighted<T extends string>(weights: Record<T, number>, luck: number): T {
  // luck shifts mass towards higher tiers (luck typically 0..1.5)
  const entries = Object.entries(weights) as [T, number][];
  const boosted = entries.map(([k, w], i) => {
    const bias = 1 + luck * (i / Math.max(1, entries.length - 1));
    return [k, w * bias] as [T, number];
  });
  const total = boosted.reduce((a, [, w]) => a + w, 0);
  let pick = Math.random() * total;
  for (const [k, w] of boosted) {
    pick -= w;
    if (pick <= 0) return k;
  }
  return boosted[0][0];
}

function rollMod(rarity: Rarity, luck: number): RollMod {
  const tier = pickWeighted(TIER_WEIGHTS[rarity], luck);
  const [lo, hi] = TIER_RANGES[tier];
  const mult = +(lo + Math.random() * (hi - lo)).toFixed(3);
  const r = Math.random();
  const type: RollMod["type"] = r < 0.45 ? "click" : r < 0.9 ? "passive" : "both";
  return { type, mult, tier };
}

function rollModifierSet(rarity: Rarity, luck: number): RollMod[] {
  // 1..3 modifiers, count weighted slightly by rarity tier
  const tierIdx: Record<Rarity, number> = {
    common: 0, uncommon: 1, rare: 2, epic: 3, mythic: 4, legendary: 5, secret: 6,
  };
  const r = Math.random();
  const idx = tierIdx[rarity];
  let count = 1;
  if (r < 0.55) count = 1;
  else if (r < 0.55 + 0.3 + idx * 0.02) count = 2;
  else count = 3;
  return Array.from({ length: count }, () => rollMod(rarity, luck));
}

export async function doGetRollInfo(userId: string) {
  const loadout = await loadLoadout(userId);
  if (!loadout.brainrot) return { equipped: null as null };

  const { data: cat } = await supabaseAdmin
    .from("brainrots_catalog")
    .select("base_price")
    .eq("id", loadout.brainrot.brainrot_id)
    .maybeSingle();

  const luck = loadout.pets.reduce((a, p) => a + (p.luck_bonus ?? 0), 0);
  const cost = rollCost(Number(cat?.base_price ?? 1000), loadout.brainrot.rarity, loadout.brainrot.rolls_used);

  const { data: hist } = await supabaseAdmin
    .from("roll_history")
    .select("id, result, cost, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  return {
    equipped: {
      uid: loadout.brainrot.id,
      brainrot_id: loadout.brainrot.brainrot_id,
      name: loadout.brainrot.name,
      image_url: loadout.brainrot.image_url,
      rarity: loadout.brainrot.rarity,
      modifiers: loadout.brainrot.modifiers as RollMod[],
      rolls_used: loadout.brainrot.rolls_used,
      cost,
      free_left: Math.max(0, FREE_ROLLS - loadout.brainrot.rolls_used),
      luck,
    },
    history: (hist ?? []).map((h) => ({
      id: h.id,
      cost: Number(h.cost),
      created_at: h.created_at,
      result: h.result as { keep: boolean; mods: RollMod[] },
    })),
  };
}

export async function doRollBrainrot(userId: string, keep: boolean) {
  const loadout = await loadLoadout(userId);
  if (!loadout.brainrot) throw new Error("no_brainrot_equipped");
  const br = loadout.brainrot;

  const { data: cat } = await supabaseAdmin
    .from("brainrots_catalog")
    .select("base_price")
    .eq("id", br.brainrot_id)
    .maybeSingle();
  const cost = rollCost(Number(cat?.base_price ?? 1000), br.rarity, br.rolls_used);

  const { data: state } = await supabaseAdmin
    .from("user_state")
    .select("btoken, best_roll_multiplier")
    .eq("user_id", userId)
    .maybeSingle();
  if (!state) throw new Error("no_state");
  const balance = Number(state.btoken);
  if (balance < cost) throw new Error("insufficient");

  const luck = loadout.pets.reduce((a, p) => a + (p.luck_bonus ?? 0), 0);
  const newMods = rollModifierSet(br.rarity, luck);

  // best multiplier across set
  const bestNew = newMods.reduce((a, m) => Math.max(a, m.mult), 1);
  const bestOverall = Math.max(Number(state.best_roll_multiplier ?? 1), bestNew);

  // Apply: keep replaces modifiers, otherwise just preview & charge
  const finalMods = keep ? newMods : (br.modifiers as RollMod[]);

  await supabaseAdmin
    .from("user_brainrots")
    .update({
      modifiers: finalMods as unknown as never,
      rolls_used: br.rolls_used + 1,
    })
    .eq("id", br.id);

  await supabaseAdmin
    .from("user_state")
    .update({
      btoken: balance - cost,
      best_roll_multiplier: bestOverall,
    })
    .eq("user_id", userId);

  await supabaseAdmin.from("roll_history").insert({
    user_id: userId,
    brainrot_id: br.brainrot_id,
    user_brainrot_id: br.id,
    cost,
    result: { keep, mods: newMods } as unknown as never,
  });

  await bumpQuestProgress(userId, "rolls", 1);
  if (cost > 0) await bumpQuestProgress(userId, "spend", cost);

  return {
    ok: true,
    cost,
    btoken: balance - cost,
    new_mods: newMods,
    applied_mods: finalMods,
    rolls_used: br.rolls_used + 1,
    kept: keep,
  };
}