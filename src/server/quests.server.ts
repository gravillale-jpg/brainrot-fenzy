import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeDerived, loadLoadout } from "@/server/game.server";

export type QuestKind =
  | "clicks"
  | "earn"
  | "spend"
  | "rolls"
  | "buy_brainrot"
  | "buy_pet"
  | "sell"
  | "equip_brainrot"
  | "equip_pet"
  | "balance";

export type DailyQuest = {
  id: string;
  kind: QuestKind;
  target: number;
  reward: number;
  title_ru: string;
  title_en: string;
  difficulty: number;
  progress: number;
  claimed: boolean;
};

const DAILY_COUNT = 5;

function todayUtc(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

type QCRow = {
  id: string; kind: string; target_value: number | string;
  reward_btoken: number | string; title_ru: string; title_en: string; difficulty: number;
};

function pickN<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  const out: T[] = [];
  while (a.length && out.length < n) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}

async function generateDaily(): Promise<DailyQuest[]> {
  const { data } = await supabaseAdmin
    .from("quests_catalog")
    .select("id, kind, target_value, reward_btoken, title_ru, title_en, difficulty");
  const all = (data ?? []) as QCRow[];
  if (!all.length) return [];
  const easy = all.filter((q) => q.difficulty <= 1);
  const med = all.filter((q) => q.difficulty === 2);
  const hard = all.filter((q) => q.difficulty >= 3);
  const picked = [...pickN(easy, 3), ...pickN(med, 1), ...pickN(hard, 1)];
  while (picked.length < DAILY_COUNT) {
    const rest = all.filter((q) => !picked.some((p) => p.id === q.id));
    if (!rest.length) break;
    picked.push(rest[Math.floor(Math.random() * rest.length)]);
  }
  return picked.slice(0, DAILY_COUNT).map((q) => ({
    id: q.id,
    kind: q.kind as QuestKind,
    target: Number(q.target_value),
    reward: Number(q.reward_btoken),
    title_ru: q.title_ru,
    title_en: q.title_en,
    difficulty: q.difficulty,
    progress: 0,
    claimed: false,
  }));
}

async function loadOrCreateDaily(userId: string): Promise<DailyQuest[]> {
  const date = todayUtc();
  const { data } = await supabaseAdmin
    .from("user_quests")
    .select("quests, quest_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (data && data.quest_date === date && Array.isArray(data.quests) && (data.quests as unknown[]).length) {
    return data.quests as unknown as DailyQuest[];
  }
  const fresh = await generateDaily();
  await supabaseAdmin
    .from("user_quests")
    .upsert(
      { user_id: userId, quest_date: date, quests: fresh as unknown as never },
      { onConflict: "user_id" }
    );
  return fresh;
}

export async function bumpQuestProgress(userId: string, kind: QuestKind, amount: number) {
  if (amount <= 0) return;
  const date = todayUtc();
  const { data } = await supabaseAdmin
    .from("user_quests")
    .select("quests, quest_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.quest_date !== date) return;
  const list = (data.quests as unknown as DailyQuest[]) ?? [];
  let changed = false;
  for (const q of list) {
    if (q.kind !== kind || q.claimed) continue;
    const next = kind === "balance" ? Math.max(q.progress, amount) : q.progress + amount;
    if (next === q.progress) continue;
    q.progress = Math.min(q.target, next);
    changed = true;
  }
  if (!changed) return;
  await supabaseAdmin
    .from("user_quests")
    .update({ quests: list as unknown as never })
    .eq("user_id", userId)
    .eq("quest_date", date);
}

export async function doGetQuests(userId: string) {
  const quests = await loadOrCreateDaily(userId);
  const { data: state } = await supabaseAdmin
    .from("user_state").select("btoken").eq("user_id", userId).maybeSingle();
  const balance = Number(state?.btoken ?? 0);
  let mutated = false;
  for (const q of quests) {
    if (q.kind === "balance" && !q.claimed) {
      const v = Math.min(q.target, Math.floor(balance));
      if (v !== q.progress) { q.progress = v; mutated = true; }
    }
  }
  if (mutated) {
    await supabaseAdmin
      .from("user_quests")
      .update({ quests: quests as unknown as never })
      .eq("user_id", userId)
      .eq("quest_date", todayUtc());
  }
  return { date: todayUtc(), quests };
}

export async function doClaimQuest(userId: string, questId: string) {
  const date = todayUtc();
  const { data } = await supabaseAdmin
    .from("user_quests")
    .select("quests")
    .eq("user_id", userId)
    .eq("quest_date", date)
    .maybeSingle();
  if (!data) throw new Error("no_quests");
  const list = (data.quests as unknown as DailyQuest[]) ?? [];
  const q = list.find((x) => x.id === questId);
  if (!q) throw new Error("not_found");
  if (q.claimed) throw new Error("already_claimed");
  if (q.progress < q.target) throw new Error("not_complete");

  const loadout = await loadLoadout(userId);
  const derived = computeDerived(loadout);
  const reward = Math.floor(q.reward * (1 + derived.questBonus));
  q.claimed = true;

  const { data: state } = await supabaseAdmin
    .from("user_state").select("btoken, total_earned").eq("user_id", userId).maybeSingle();
  const btoken = Number(state?.btoken ?? 0) + reward;
  const total_earned = Number(state?.total_earned ?? 0) + reward;

  await Promise.all([
    supabaseAdmin.from("user_state").update({ btoken, total_earned }).eq("user_id", userId),
    supabaseAdmin
      .from("user_quests")
      .update({ quests: list as unknown as never })
      .eq("user_id", userId)
      .eq("quest_date", date),
  ]);

  return { ok: true, reward, btoken, quest: q };
}

export async function doGetStats(userId: string) {
  const loadout = await loadLoadout(userId);
  const derived = computeDerived(loadout);
  const [{ data: state }, { count: brainrotCount }, { count: petCount }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from("user_state")
      .select("btoken, total_earned, total_clicks, best_roll_multiplier, created_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("user_brainrots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabaseAdmin
      .from("user_pets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabaseAdmin
      .from("profiles")
      .select("nickname, created_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  return {
    nickname: profile?.nickname ?? null,
    joined_at: profile?.created_at ?? state?.created_at ?? null,
    state: {
      btoken: Number(state?.btoken ?? 0),
      total_earned: Number(state?.total_earned ?? 0),
      total_clicks: Number(state?.total_clicks ?? 0),
      best_roll_multiplier: Number(state?.best_roll_multiplier ?? 1),
    },
    counts: { brainrots: brainrotCount ?? 0, pets: petCount ?? 0 },
    derived,
    loadout,
  };
}

export async function doGetLeaderboard(limit = 100) {
  const { data, error } = await supabaseAdmin.rpc("get_leaderboard", { _limit: limit });
  if (error) throw error;
  return {
    entries: (data ?? []) as Array<{
      nickname: string; total_earned: number; btoken: number; total_clicks: number;
    }>,
  };
}
