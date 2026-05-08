import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Sparkles, Zap, Trash2, Check, X } from "lucide-react";
import { useAuth } from "@/stores/auth";
import {
  getInventory,
  equipBrainrot,
  unequipBrainrot,
  togglePet,
  sellBrainrot,
  sellPet,
} from "@/functions/inventory.functions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  RARITIES,
  RARITY_GLOW,
  RARITY_GRADIENT,
  RARITY_LABELS,
  RARITY_ORDER,
  type Rarity,
} from "@/lib/rarity";
import { formatBToken } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({ component: InventoryPage });

type SortKey = "rarity" | "name" | "price";

function InventoryPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchInv = useServerFn(getInventory);
  const equipBrFn = useServerFn(equipBrainrot);
  const unequipBrFn = useServerFn(unequipBrainrot);
  const togglePetFn = useServerFn(togglePet);
  const sellBrFn = useServerFn(sellBrainrot);
  const sellPetFn = useServerFn(sellPet);

  const inv = useQuery({
    queryKey: ["inventory", user?.id],
    queryFn: () => fetchInv(),
    enabled: !!user,
  });

  const [sort, setSort] = useState<SortKey>("rarity");
  const [filter, setFilter] = useState<Rarity | "all">("all");

  function refresh() {
    qc.invalidateQueries({ queryKey: ["inventory", user?.id] });
    qc.invalidateQueries({ queryKey: ["dashboard", user?.id] });
    qc.invalidateQueries({ queryKey: ["user_state", user?.id] });
  }

  const equipBr = useMutation({
    mutationFn: (uid: string) => equipBrFn({ data: { uid } }),
    onSuccess: () => {
      toast.success(t("inventory.equipped"));
      refresh();
    },
  });
  const unequipBr = useMutation({
    mutationFn: () => unequipBrFn(),
    onSuccess: refresh,
  });
  const togglePetM = useMutation({
    mutationFn: (uid: string) => togglePetFn({ data: { uid } }),
    onSuccess: (res) => {
      toast.success(res.action === "equipped" ? t("inventory.equipped") : t("inventory.unequipped"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const sellBrM = useMutation({
    mutationFn: (uid: string) => sellBrFn({ data: { uid } }),
    onSuccess: (res) => {
      toast.success(`+${formatBToken(res.refund)}`);
      refresh();
    },
    onError: (e: Error) =>
      toast.error(e.message === "equipped" ? t("inventory.cannot_sell_equipped") : e.message),
  });
  const sellPetM = useMutation({
    mutationFn: (uid: string) => sellPetFn({ data: { uid } }),
    onSuccess: (res) => {
      toast.success(`+${formatBToken(res.refund)}`);
      refresh();
    },
    onError: (e: Error) =>
      toast.error(e.message === "equipped" ? t("inventory.cannot_sell_equipped") : e.message),
  });

  const data = inv.data;

  const brainrots = useMemo(() => {
    const list = Array.isArray(data?.brainrots) ? data!.brainrots : [];
    let arr = [...list];
    if (filter !== "all") arr = arr.filter((b) => b.rarity === filter);
    arr.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price") return b.sell_price - a.sell_price;
      return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.name.localeCompare(b.name);
    });
    return arr;
  }, [data, sort, filter]);

  const pets = useMemo(() => {
    const list = Array.isArray(data?.pets) ? data!.pets : [];
    let arr = [...list];
    if (filter !== "all") arr = arr.filter((p) => p.rarity === filter);
    arr.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price") return b.sell_price - a.sell_price;
      return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.name.localeCompare(b.name);
    });
    return arr;
  }, [data, sort, filter]);

  // Loadout summary
  const equippedBr = data?.brainrots?.find((b) => b.equipped) ?? null;
  const equippedPets = data?.pets?.filter((p) => p.equipped_slot !== null) ?? [];
  const lang = i18n.language.startsWith("en") ? "en" : "ru";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-glow">{t("inventory.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("inventory.subtitle")}</p>
      </div>

      {/* Loadout preview */}
      <div className="glass-card grid gap-3 rounded-2xl p-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            {t("inventory.current_loadout")}
          </div>
          <div className="flex items-center gap-3">
            {equippedBr ? (
              <>
                <RarityAvatar
                  name={equippedBr.name}
                  rarity={equippedBr.rarity}
                  image={equippedBr.image_url}
                  size={56}
                />
                <div className="text-sm">
                  <div className="font-bold">{equippedBr.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatBToken(equippedBr.base_click)} / {formatBToken(equippedBr.base_passive)}/s
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">{t("inventory.no_brainrot")}</div>
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            {t("inventory.pets_slots")} ({equippedPets.length}/3)
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((slot) => {
              const p = equippedPets.find((x) => x.equipped_slot === slot);
              return p ? (
                <RarityAvatar key={slot} name={p.name} rarity={p.rarity} image={p.image_url} size={48} />
              ) : (
                <div
                  key={slot}
                  className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-border/60 text-xs text-muted-foreground"
                >
                  {slot}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("inventory.sort")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rarity">{t("inventory.sort_rarity")}</SelectItem>
            <SelectItem value="name">{t("inventory.sort_name")}</SelectItem>
            <SelectItem value="price">{t("inventory.sort_price")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={(v) => setFilter(v as Rarity | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("inventory.filter_all")}</SelectItem>
            {RARITIES.map((r) => (
              <SelectItem key={r} value={r}>
                {RARITY_LABELS[r][lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="brainrots">
        <TabsList>
          <TabsTrigger value="brainrots">
            {t("inventory.brainrots")} · {brainrots.length}
          </TabsTrigger>
          <TabsTrigger value="pets">
            {t("inventory.pets")} · {pets.length}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brainrots" className="mt-4">
          {brainrots.length === 0 ? (
            <EmptyState text={t("inventory.empty")} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <AnimatePresence>
                {brainrots.map((b) => (
                  <motion.div
                    key={b.uid}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <ItemCard
                      name={b.name}
                      rarity={b.rarity}
                      image={b.image_url}
                      lang={lang}
                      equipped={b.equipped}
                      stats={
                        <>
                          <Stat icon={<Zap className="h-3 w-3" />} value={`+${formatBToken(b.base_click)}`} />
                          <Stat
                            icon={<Sparkles className="h-3 w-3" />}
                            value={`${formatBToken(b.base_passive)}/s`}
                          />
                        </>
                      }
                      sellPrice={b.sell_price}
                      onEquip={() => (b.equipped ? unequipBr.mutate() : equipBr.mutate(b.uid))}
                      onSell={() => sellBrM.mutate(b.uid)}
                      disabled={equipBr.isPending || sellBrM.isPending}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pets" className="mt-4">
          {pets.length === 0 ? (
            <EmptyState text={t("inventory.empty")} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <AnimatePresence>
                {pets.map((p) => (
                  <motion.div
                    key={p.uid}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <ItemCard
                      name={p.name}
                      rarity={p.rarity}
                      image={p.image_url}
                      lang={lang}
                      equipped={p.equipped_slot !== null}
                      stats={
                        <>
                          {p.click_bonus > 0 && (
                            <Stat icon={<Zap className="h-3 w-3" />} value={`+${(p.click_bonus * 100).toFixed(0)}%`} />
                          )}
                          {p.passive_bonus > 0 && (
                            <Stat
                              icon={<Sparkles className="h-3 w-3" />}
                              value={`+${(p.passive_bonus * 100).toFixed(0)}%`}
                            />
                          )}
                        </>
                      }
                      sellPrice={p.sell_price}
                      onEquip={() => togglePetM.mutate(p.uid)}
                      onSell={() => sellPetM.mutate(p.uid)}
                      disabled={togglePetM.isPending || sellPetM.isPending}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RarityAvatar({
  name,
  rarity,
  image,
  size = 64,
}: {
  name: string;
  rarity: Rarity;
  image: string | null;
  size?: number;
}) {
  return (
    <div
      className={`grid place-items-center rounded-full bg-gradient-to-br ${RARITY_GRADIENT[rarity]} ${RARITY_GLOW[rarity]}`}
      style={{ width: size, height: size }}
      title={name}
    >
      {image ? (
        <img src={image} alt={name} className="rounded-full object-cover" style={{ width: size - 6, height: size - 6 }} />
      ) : (
        <span className="text-2xl">🧠</span>
      )}
    </div>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-background/40 px-1.5 py-0.5 text-[10px] font-bold">
      {icon}
      {value}
    </span>
  );
}

function ItemCard({
  name,
  rarity,
  image,
  lang,
  equipped,
  stats,
  sellPrice,
  onEquip,
  onSell,
  disabled,
}: {
  name: string;
  rarity: Rarity;
  image: string | null;
  lang: "ru" | "en";
  equipped: boolean;
  stats: React.ReactNode;
  sellPrice: number;
  onEquip: () => void;
  onSell: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`glass-card relative flex flex-col gap-2 rounded-2xl p-3 transition-all ${
        equipped ? "ring-2 ring-primary" : ""
      }`}
    >
      {equipped && (
        <Badge className="absolute right-2 top-2 z-10 bg-primary text-primary-foreground">
          <Check className="mr-1 h-3 w-3" />
          {t("inventory.equipped_badge")}
        </Badge>
      )}
      <div className="flex justify-center py-2">
        <RarityAvatar name={name} rarity={rarity} image={image} size={88} />
      </div>
      <div className="text-center">
        <div className="truncate text-sm font-bold">{name}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {RARITY_LABELS[rarity][lang]}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-1">{stats}</div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Coins className="h-3 w-3" />
          {formatBToken(sellPrice)}
        </span>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant={equipped ? "secondary" : "default"} onClick={onEquip} disabled={disabled} className="flex-1">
          {equipped ? <X className="mr-1 h-3.5 w-3.5" /> : <Check className="mr-1 h-3.5 w-3.5" />}
          {equipped ? t("inventory.unequip") : t("inventory.equip")}
        </Button>
        <Button size="sm" variant="outline" onClick={onSell} disabled={disabled || equipped} title={t("inventory.sell")}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass-card grid place-items-center rounded-2xl py-16 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
