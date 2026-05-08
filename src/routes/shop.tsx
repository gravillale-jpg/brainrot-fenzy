import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Clock, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/stores/auth";
import { getShop, buyShopItem } from "@/functions/shop.functions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RARITY_GLOW, RARITY_GRADIENT, RARITY_LABELS, type Rarity } from "@/lib/rarity";
import { formatBToken } from "@/lib/format";

export const Route = createFileRoute("/shop")({ component: ShopPage });

type ShopItem = {
  slot: number;
  item_id: string;
  rarity: Rarity;
  name: string;
  image_url: string | null;
  price: number;
  sold: boolean;
};

function useCountdown(targetIso: string | undefined) {
  const [remaining, setRemaining] = useState(() =>
    targetIso ? Math.max(0, new Date(targetIso).getTime() - Date.now()) : 0
  );
  useEffect(() => {
    if (!targetIso) return;
    const tick = () =>
      setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}

function fmtTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function ShopPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchShop = useServerFn(getShop);
  const buyFn = useServerFn(buyShopItem);

  const shop = useQuery({
    queryKey: ["shop", user?.id],
    queryFn: () => fetchShop(),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const lang = i18n.language.startsWith("en") ? "en" : "ru";

  const buy = useMutation({
    mutationFn: (vars: { type: "brainrot" | "pet"; slot: number }) =>
      buyFn({ data: vars }),
    onSuccess: (res) => {
      toast.success(`${t("shop.bought")}: ${res.item.name}`);
      qc.invalidateQueries({ queryKey: ["shop", user?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard", user?.id] });
      qc.invalidateQueries({ queryKey: ["inventory", user?.id] });
    },
    onError: (e: Error) => {
      const map: Record<string, string> = {
        insufficient: t("shop.no_funds"),
        expired: t("shop.expired"),
        sold: t("shop.sold_out"),
      };
      toast.error(map[e.message] ?? e.message);
      if (e.message === "expired") {
        qc.invalidateQueries({ queryKey: ["shop", user?.id] });
      }
    },
  });

  const data = shop.data;
  const brRemaining = useCountdown(data?.brainrot.refresh_at);
  const petRemaining = useCountdown(data?.pet.refresh_at);

  // Auto-refetch the shop a bit after the timer hits 0
  useEffect(() => {
    if (!data) return;
    const min = Math.min(brRemaining, petRemaining);
    if (min === 0) {
      const id = setTimeout(
        () => qc.invalidateQueries({ queryKey: ["shop", user?.id] }),
        500
      );
      return () => clearTimeout(id);
    }
  }, [brRemaining, petRemaining, data, qc, user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-glow">
            <ShoppingBag className="h-6 w-6 text-primary" />
            {t("shop.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("shop.subtitle")}</p>
        </div>
      </div>

      <Tabs defaultValue="brainrot">
        <TabsList>
          <TabsTrigger value="brainrot">
            {t("shop.brainrots")}
            <CountdownPill remaining={brRemaining} />
          </TabsTrigger>
          <TabsTrigger value="pet">
            {t("shop.pets")}
            <CountdownPill remaining={petRemaining} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brainrot" className="mt-4">
          <ShopGrid
            items={(data?.brainrot.items as ShopItem[] | undefined) ?? []}
            type="brainrot"
            lang={lang}
            loading={shop.isLoading}
            onBuy={(slot) => buy.mutate({ type: "brainrot", slot })}
            disabled={buy.isPending}
          />
        </TabsContent>
        <TabsContent value="pet" className="mt-4">
          <ShopGrid
            items={(data?.pet.items as ShopItem[] | undefined) ?? []}
            type="pet"
            lang={lang}
            loading={shop.isLoading}
            onBuy={(slot) => buy.mutate({ type: "pet", slot })}
            disabled={buy.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CountdownPill({ remaining }: { remaining: number }) {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-background/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
      <Clock className="h-3 w-3" />
      {fmtTime(remaining)}
    </span>
  );
}

function ShopGrid({
  items,
  type,
  lang,
  loading,
  onBuy,
  disabled,
}: {
  items: ShopItem[];
  type: "brainrot" | "pet";
  lang: "ru" | "en";
  loading: boolean;
  onBuy: (slot: number) => void;
  disabled?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card h-64 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
      <AnimatePresence mode="popLayout">
        {items
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((it) => (
            <motion.div
              key={`${type}-${it.slot}`}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
            >
              <ShopCard item={it} lang={lang} onBuy={() => onBuy(it.slot)} disabled={disabled} />
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}

function ShopCard({
  item,
  lang,
  onBuy,
  disabled,
}: {
  item: ShopItem;
  lang: "ru" | "en";
  onBuy: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`glass-card relative flex flex-col gap-2 rounded-2xl p-3 transition-all ${
        item.sold ? "opacity-50" : ""
      } ${item.rarity === "secret" ? "ring-2 ring-pink-400/60" : ""}`}
    >
      {item.rarity === "secret" && (
        <Badge className="absolute left-2 top-2 z-10 bg-gradient-to-r from-pink-500 to-indigo-500 text-white">
          <Sparkles className="mr-1 h-3 w-3" />
          {t("rarity.secret")}
        </Badge>
      )}
      <div className="flex justify-center py-2">
        <div
          className={`grid place-items-center rounded-full bg-gradient-to-br ${RARITY_GRADIENT[item.rarity]} ${RARITY_GLOW[item.rarity]}`}
          style={{ width: 96, height: 96 }}
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="h-[88px] w-[88px] rounded-full object-cover"
              draggable={false}
            />
          ) : (
            <span className="text-3xl">🧠</span>
          )}
        </div>
      </div>
      <div className="text-center">
        <div className="truncate text-sm font-bold">{item.name}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {RARITY_LABELS[item.rarity][lang]}
        </div>
      </div>
      <div className="flex items-center justify-center gap-1 text-sm font-black text-primary">
        <Coins className="h-3.5 w-3.5" />
        {formatBToken(item.price)}
      </div>
      <Button
        size="sm"
        onClick={onBuy}
        disabled={disabled || item.sold}
        variant={item.sold ? "secondary" : "default"}
        className="w-full"
      >
        {item.sold ? t("shop.sold_out") : t("shop.buy")}
      </Button>
    </div>
  );
}
