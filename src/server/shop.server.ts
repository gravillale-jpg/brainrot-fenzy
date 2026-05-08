import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { RARITY_WEIGHTS, type Rarity } from "@/lib/rarity";

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes
const SLOTS = 6;

export type ShopType = "brainrot" | "pet";

export type ShopItem = {
  slot: number;
  item_id: string;
  rarity: Rarity;
  name: string;
  image_url: string | null;
  price: number;
  sold: boolean;
};

type CatalogRow = {
  id: string;
  name: string;
  rarity: Rarity;
  image_url: string | null;
  base_price: number;
};

function pickRarity(rng: () => number, allowSecret: boolean): Rarity {
  const entries = Object.entries(RARITY_WEIGHTS) as [Rarity, number][];
  const filtered = entries.filter(([r]) => allowSecret || r !== "secret");
  const total = filtered.reduce((a, [, w]) => a + w, 0);
  let pick = rng() * total;
  for (const [r, w] of filtered) {
    pick -= w;
    if (pick <= 0) return r;
  }
  return "common";
}

function rollItems(catalog: CatalogRow[], type: ShopType): ShopItem[] {
  const byRarity = new Map<Rarity, CatalogRow[]>();
  for (const c of catalog) {
    const arr = byRarity.get(c.rarity) ?? [];
    arr.push(c);
    byRarity.set(c.rarity, arr);
  }
  const out: ShopItem[] = [];
  // First slot guarantees a common to keep economy moving
  const commons = byRarity.get("common") ?? [];
  if (commons.length) {
    const c = commons[Math.floor(Math.random() * commons.length)];
    out.push({
      slot: 0,
      item_id: c.id,
      rarity: c.rarity,
      name: c.name,
      image_url: c.image_url,
      price: Number(c.base_price),
      sold: false,
    });
  }
  for (let i = out.length; i < SLOTS; i++) {
    // 1.5% chance any non-first slot is a "secret" roll
    const allowSecret = Math.random() < 0.015;
    let rarity = pickRarity(Math.random, allowSecret);
    let pool = byRarity.get(rarity) ?? [];
    if (!pool.length) {
      // fall back through rarity tiers down to common
      const order: Rarity[] = ["legendary", "mythic", "epic", "rare", "uncommon", "common"];
      for (const r of order) {
        const p = byRarity.get(r) ?? [];
        if (p.length) {
          rarity = r;
          pool = p;
          break;
        }
      }
    }
    if (!pool.length) continue;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    out.push({
      slot: i,
      item_id: pick.id,
      rarity: pick.rarity,
      name: pick.name,
      image_url: pick.image_url,
      price: Number(pick.base_price),
      sold: false,
    });
    void type;
  }
  return out;
}

async function loadCatalog(type: ShopType): Promise<CatalogRow[]> {
  if (type === "brainrot") {
    const { data } = await supabaseAdmin
      .from("brainrots_catalog")
      .select("id, name, rarity, image_url, base_price");
    return ((data ?? []) as Array<{ id: string; name: string; rarity: string; image_url: string | null; base_price: number | string }>).map((r) => ({
      id: r.id,
      name: r.name,
      rarity: r.rarity as Rarity,
      image_url: r.image_url,
      base_price: Number(r.base_price),
    }));
  }
  const { data } = await supabaseAdmin
    .from("pets_catalog")
    .select("id, name, rarity, image_url, base_price");
  return ((data ?? []) as Array<{ id: string; name: string; rarity: string; image_url: string | null; base_price: number | string }>).map((r) => ({
    id: r.id,
    name: r.name,
    rarity: r.rarity as Rarity,
    image_url: r.image_url,
    base_price: Number(r.base_price),
  }));
}

async function ensureShop(userId: string, type: ShopType) {
  const { data } = await supabaseAdmin
    .from("user_shop")
    .select("items, refresh_at")
    .eq("user_id", userId)
    .eq("shop_type", type)
    .maybeSingle();
  const now = Date.now();
  const expired = !data || new Date(data.refresh_at).getTime() <= now;
  if (!expired && Array.isArray(data!.items)) {
    return {
      items: data!.items as unknown as ShopItem[],
      refresh_at: data!.refresh_at,
    };
  }
  const catalog = await loadCatalog(type);
  const items = rollItems(catalog, type);
  const refresh_at = new Date(now + REFRESH_MS).toISOString();
  await supabaseAdmin
    .from("user_shop")
    .upsert(
      { user_id: userId, shop_type: type, items: items as unknown as never, refresh_at },
      { onConflict: "user_id,shop_type" }
    );
  return { items, refresh_at };
}

export async function doGetShop(userId: string) {
  const [brainrot, pet] = await Promise.all([
    ensureShop(userId, "brainrot"),
    ensureShop(userId, "pet"),
  ]);
  return { brainrot, pet };
}

export async function doBuyShopItem(
  userId: string,
  type: ShopType,
  slot: number
) {
  const { data: shop } = await supabaseAdmin
    .from("user_shop")
    .select("items, refresh_at")
    .eq("user_id", userId)
    .eq("shop_type", type)
    .maybeSingle();
  if (!shop) throw new Error("shop_not_found");
  if (new Date(shop.refresh_at).getTime() <= Date.now()) throw new Error("expired");

  const items = (Array.isArray(shop.items) ? (shop.items as unknown as ShopItem[]) : []).slice();
  const item = items.find((x) => x.slot === slot);
  if (!item) throw new Error("slot_not_found");
  if (item.sold) throw new Error("sold");

  // Validate price/rarity against catalog (anti-tamper)
  const table = type === "brainrot" ? "brainrots_catalog" : "pets_catalog";
  const { data: cat } = await supabaseAdmin
    .from(table)
    .select("base_price, rarity, name, image_url")
    .eq("id", item.item_id)
    .maybeSingle();
  if (!cat) throw new Error("catalog_missing");
  const price = Number(cat.base_price);
  if (price !== item.price) item.price = price; // sync in case of drift

  const { data: state } = await supabaseAdmin
    .from("user_state")
    .select("btoken")
    .eq("user_id", userId)
    .maybeSingle();
  if (!state) throw new Error("no_state");
  const balance = Number(state.btoken);
  if (balance < price) throw new Error("insufficient");

  // Deduct + grant
  const newBalance = balance - price;
  await supabaseAdmin
    .from("user_state")
    .update({ btoken: newBalance })
    .eq("user_id", userId);

  if (type === "brainrot") {
    await supabaseAdmin
      .from("user_brainrots")
      .insert({ user_id: userId, brainrot_id: item.item_id });
  } else {
    await supabaseAdmin
      .from("user_pets")
      .insert({ user_id: userId, pet_id: item.item_id });
  }

  // Mark slot as sold
  const updated = items.map((x) => (x.slot === slot ? { ...x, sold: true } : x));
  await supabaseAdmin
    .from("user_shop")
    .update({ items: updated as unknown as never })
    .eq("user_id", userId)
    .eq("shop_type", type);

  return { ok: true, btoken: newBalance, item };
}
