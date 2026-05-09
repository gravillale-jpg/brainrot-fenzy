import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Rarity } from "@/lib/rarity";
import { bumpQuestProgress } from "@/server/quests.server";

type Modifier = { type: "click" | "passive" | "both"; mult: number };

type EquippedBrainrot = {
  id: string;
  brainrot_id: string;
  base_click: number;
  base_passive: number;
  rarity: Rarity;
  name: string;
  image_url: string | null;
  theme_set: string | null;
  modifiers: Modifier[];
  rolls_used: number;
};

type EquippedPet = {
  id: string;
  pet_id: string;
  name: string;
  image_url: string | null;
  rarity: Rarity;
  theme_set: string | null;
  click_bonus: number;
  passive_bonus: number;
  luck_bonus: number;
  quest_bonus: number;
};

export type Loadout = {
  brainrot: EquippedBrainrot | null;
  pets: EquippedPet[];
};

export type DerivedStats = {
  clickValue: number;
  passivePerSec: number;
  luck: number;
  questBonus: number;
  synergies: { rarityBonus: number; themeBonus: number; full: boolean };
};

const MAX_CLICKS_PER_SEC = 25;

function asMods(j: unknown): Modifier[] {
  if (!Array.isArray(j)) return [];
  return j.filter(
    (m): m is Modifier =>
      !!m &&
      typeof m === "object" &&
      "type" in m &&
      "mult" in m &&
      typeof (m as { mult: unknown }).mult === "number"
  );
}

export async function loadLoadout(userId: string): Promise<Loadout> {
  const { data: ld } = await supabaseAdmin
    .from("user_loadout")
    .select("equipped_brainrot, pet_slot_1, pet_slot_2, pet_slot_3")
    .eq("user_id", userId)
    .maybeSingle();

  let brainrot: EquippedBrainrot | null = null;
  if (ld?.equipped_brainrot) {
    const { data: ub } = await supabaseAdmin
      .from("user_brainrots")
      .select("id, brainrot_id, modifiers, rolls_used")
      .eq("id", ld.equipped_brainrot)
      .maybeSingle();
    if (ub) {
      const { data: cat } = await supabaseAdmin
        .from("brainrots_catalog")
        .select("name, rarity, image_url, base_click, base_passive, theme_set")
        .eq("id", ub.brainrot_id)
        .maybeSingle();
      if (cat) {
        brainrot = {
          id: ub.id,
          brainrot_id: ub.brainrot_id,
          name: cat.name,
          image_url: cat.image_url,
          rarity: cat.rarity as Rarity,
          base_click: Number(cat.base_click),
          base_passive: Number(cat.base_passive),
          theme_set: cat.theme_set,
          modifiers: asMods(ub.modifiers),
          rolls_used: ub.rolls_used ?? 0,
        };
      }
    }
  }

  const petIds = [ld?.pet_slot_1, ld?.pet_slot_2, ld?.pet_slot_3].filter(
    (x): x is string => !!x
  );
  const pets: EquippedPet[] = [];
  if (petIds.length) {
    const { data: ups } = await supabaseAdmin
      .from("user_pets")
      .select("id, pet_id")
      .in("id", petIds);
    if (ups?.length) {
      const { data: cats } = await supabaseAdmin
        .from("pets_catalog")
        .select(
          "id, name, image_url, rarity, theme_set, click_bonus, passive_bonus, luck_bonus, quest_bonus"
        )
        .in(
          "id",
          ups.map((u) => u.pet_id)
        );
      const byId = new Map(cats?.map((c) => [c.id, c]) ?? []);
      for (const u of ups) {
        const c = byId.get(u.pet_id);
        if (!c) continue;
        pets.push({
          id: u.id,
          pet_id: u.pet_id,
          name: c.name,
          image_url: c.image_url,
          rarity: c.rarity as Rarity,
          theme_set: c.theme_set,
          click_bonus: Number(c.click_bonus),
          passive_bonus: Number(c.passive_bonus),
          luck_bonus: Number(c.luck_bonus),
          quest_bonus: Number(c.quest_bonus),
        });
      }
    }
  }

  return { brainrot, pets };
}

export function computeDerived(loadout: Loadout): DerivedStats {
  const { brainrot, pets } = loadout;
  const baseClick = brainrot?.base_click ?? 1;
  const basePassive = brainrot?.base_passive ?? 0;

  let clickMult = 1;
  let passiveMult = 1;
  for (const m of brainrot?.modifiers ?? []) {
    if (m.type === "click" || m.type === "both") clickMult *= m.mult;
    if (m.type === "passive" || m.type === "both") passiveMult *= m.mult;
  }

  let petClick = 0;
  let petPassive = 0;
  let luck = 0;
  let questBonus = 0;
  for (const p of pets) {
    petClick += p.click_bonus;
    petPassive += p.passive_bonus;
    luck += p.luck_bonus;
    questBonus += p.quest_bonus;
  }

  // Synergy
  let rarityBonus = 0;
  if (pets.length >= 2) {
    const r = pets[0].rarity;
    if (pets.every((p) => p.rarity === r)) {
      rarityBonus = pets.length >= 3 ? 0.15 : 0.05;
    }
  }
  let themeBonus = 0;
  let full = false;
  if (pets.length === 3 && brainrot?.theme_set) {
    const ts = brainrot.theme_set;
    if (pets.every((p) => p.theme_set === ts)) {
      themeBonus = 0.25;
      full = true;
    }
  }
  const synergyMult = 1 + rarityBonus + themeBonus;

  const clickValue = baseClick * clickMult * (1 + petClick) * synergyMult;
  const passivePerSec = basePassive * passiveMult * (1 + petPassive) * synergyMult;

  return {
    clickValue,
    passivePerSec,
    luck,
    questBonus,
    synergies: { rarityBonus, themeBonus, full },
  };
}

async function applyPassive(
  userId: string,
  passivePerSec: number
): Promise<{ btoken: number; total_earned: number; gained: number }> {
  const { data: state } = await supabaseAdmin
    .from("user_state")
    .select("btoken, total_earned, last_passive_tick")
    .eq("user_id", userId)
    .maybeSingle();
  if (!state) return { btoken: 0, total_earned: 0, gained: 0 };

  const now = Date.now();
  const last = new Date(state.last_passive_tick).getTime();
  const elapsedSec = Math.max(0, Math.min(60 * 60 * 12, (now - last) / 1000)); // cap 12h
  const gained = passivePerSec * elapsedSec;
  const btoken = Number(state.btoken) + gained;
  const total_earned = Number(state.total_earned) + gained;

  await supabaseAdmin
    .from("user_state")
    .update({
      btoken,
      total_earned,
      last_passive_tick: new Date(now).toISOString(),
    })
    .eq("user_id", userId);

  return { btoken, total_earned, gained };
}

export async function doProcessClicks(userId: string, rawCount: number) {
  const count = Math.max(1, Math.min(50, Math.floor(rawCount)));
  const loadout = await loadLoadout(userId);
  const derived = computeDerived(loadout);

  const { data: state } = await supabaseAdmin
    .from("user_state")
    .select(
      "btoken, total_earned, total_clicks, last_click_window_start, last_click_window_count"
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (!state) throw new Error("no state");

  const now = Date.now();
  const winStart = new Date(state.last_click_window_start).getTime();
  let windowStart = winStart;
  let windowCount = state.last_click_window_count ?? 0;
  if (now - winStart > 1000) {
    windowStart = now;
    windowCount = 0;
  }
  const allowed = Math.max(0, MAX_CLICKS_PER_SEC - windowCount);
  const accepted = Math.min(count, allowed);

  // Apply passive first
  const passive = await applyPassive(userId, derived.passivePerSec);

  const earned = accepted * derived.clickValue;
  const btoken = passive.btoken + earned;
  const total_earned = passive.total_earned + earned;
  const total_clicks = Number(state.total_clicks) + accepted;

  await supabaseAdmin
    .from("user_state")
    .update({
      btoken,
      total_earned,
      total_clicks,
      last_click_window_start: new Date(windowStart).toISOString(),
      last_click_window_count: windowCount + accepted,
    })
    .eq("user_id", userId);

  if (accepted > 0) {
    await bumpQuestProgress(userId, "clicks", accepted);
    if (earned > 0) await bumpQuestProgress(userId, "earn", earned);
    await bumpQuestProgress(userId, "balance", btoken);
  }

  return {
    btoken,
    total_earned,
    total_clicks,
    accepted,
    rejected: count - accepted,
    clickValue: derived.clickValue,
    passivePerSec: derived.passivePerSec,
    passiveGained: passive.gained,
  };
}

export async function doGetDashboard(userId: string) {
  const loadout = await loadLoadout(userId);
  const derived = computeDerived(loadout);
  const passive = await applyPassive(userId, derived.passivePerSec);

  const { data: state } = await supabaseAdmin
    .from("user_state")
    .select("btoken, total_earned, total_clicks, best_roll_multiplier")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    state: {
      btoken: Number(state?.btoken ?? passive.btoken),
      total_earned: Number(state?.total_earned ?? passive.total_earned),
      total_clicks: Number(state?.total_clicks ?? 0),
      best_roll_multiplier: Number(state?.best_roll_multiplier ?? 1),
    },
    loadout,
    derived,
    passiveGained: passive.gained,
  };
}
