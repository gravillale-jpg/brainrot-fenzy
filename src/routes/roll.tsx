import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Dices, Star, History } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { getRollInfo, rollBrainrot } from "@/functions/roll.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RARITY_GLOW, RARITY_GRADIENT, RARITY_LABELS, type Rarity } from "@/lib/rarity";
import { formatBToken } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/roll")({ component: RollPage });

type ModTier = "weak" | "common" | "strong" | "mythic" | "godly" | "divine";
type Mod = { type: "click" | "passive" | "both"; mult: number; tier: ModTier };

const TIER_GRADIENT: Record<ModTier, string> = {
  weak: "from-slate-400 to-slate-600",
  common: "from-emerald-400 to-emerald-600",
  strong: "from-sky-400 to-blue-600",
  mythic: "from-fuchsia-400 to-purple-600",
  godly: "from-amber-300 to-orange-500",
  divine: "from-pink-400 via-purple-500 to-indigo-500",
};

const TIER_GLOW: Record<ModTier, string> = {
  weak: "shadow-[0_0_18px_rgba(148,163,184,0.4)]",
  common: "shadow-[0_0_22px_rgba(52,211,153,0.55)]",
  strong: "shadow-[0_0_26px_rgba(56,189,248,0.6)]",
  mythic: "shadow-[0_0_30px_rgba(217,70,239,0.65)]",
  godly: "shadow-[0_0_38px_rgba(251,191,36,0.8)]",
  divine: "shadow-[0_0_50px_rgba(236,72,153,0.85)]",
};

function RollPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "ru";
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchInfo = useServerFn(getRollInfo);
  const rollFn = useServerFn(rollBrainrot);

  const info = useQuery({
    queryKey: ["roll-info", user?.id],
    queryFn: () => fetchInfo(),
    enabled: !!user,
  });

  const [spinning, setSpinning] = useState(false);
  const [pending, setPending] = useState<{ mods: Mod[]; cost: number } | null>(null);

  const rollM = useMutation({
    mutationFn: (keep: boolean) => rollFn({ data: { keep } }),
    onError: (e: Error) => {
      setSpinning(false);
      setPending(null);
      toast.error(e.message === "insufficient" ? t("roll.no_funds") : e.message);
    },
  });

  const equipped = info.data?.equipped ?? null;
  const history = info.data?.history ?? [];

  async function commitRoll() {
    if (!equipped) return;
    setSpinning(true);
    setPending(null);
    const [res] = await Promise.all([
      rollM.mutateAsync(true),
      new Promise((r) => setTimeout(r, 1600)),
    ]);
    setSpinning(false);
    setPending({ mods: res.applied_mods as Mod[], cost: res.cost });
    qc.invalidateQueries({ queryKey: ["user_state", user?.id] });
    qc.invalidateQueries({ queryKey: ["roll-info", user?.id] });
    qc.invalidateQueries({ queryKey: ["dashboard", user?.id] });
    toast.success(t("roll.kept"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-glow">{t("roll.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("roll.subtitle")}</p>
      </div>

      {!equipped && (
        <div className="glass-card grid place-items-center gap-3 rounded-2xl py-16 text-center">
          <Dices className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("roll.no_equipped")}</p>
          <Button asChild>
            <Link to="/inventory">{t("nav.inventory")}</Link>
          </Button>
        </div>
      )}

      {equipped && (
        <>
          <BrainrotPanel equipped={equipped} lang={lang} />

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("roll.cost")}
                </div>
                <div className="text-xl font-black text-primary">
                  {equipped.cost === 0 ? t("roll.free") : formatBToken(equipped.cost)}
                </div>
                {equipped.free_left > 0 && (
                  <Badge variant="secondary" className="mt-1">
                    {t("roll.free_left", { n: equipped.free_left })}
                  </Badge>
                )}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{t("roll.rolls_used")}: <span className="font-bold text-foreground">{equipped.rolls_used}</span></div>
                <div className="mt-1 inline-flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-400" />
                  {t("roll.luck")}: <span className="font-bold text-foreground">+{(equipped.luck * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <RollMachine spinning={spinning} mods={pending?.mods ?? null} lang={lang} />

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                size="lg"
                onClick={commitRoll}
                disabled={spinning || rollM.isPending}
                className="min-w-40"
              >
                <Dices className="mr-2 h-5 w-5" />
                {spinning ? t("roll.rolling") : t("roll.roll")}
              </Button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold">
                <History className="h-4 w-4" /> {t("roll.history")}
              </div>
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-background/40 px-3 py-2 text-xs"
                  >
                    <span className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleString(lang)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Coins className="h-3 w-3" /> {h.cost === 0 ? t("roll.free") : formatBToken(h.cost)}
                    </span>
                    <div className="ml-auto flex flex-wrap gap-1">
                      {h.result.mods.map((m, i) => (
                        <ModChip key={i} mod={m} lang={lang} compact />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

function BrainrotPanel({
  equipped,
  lang,
}: {
  equipped: NonNullable<Awaited<ReturnType<typeof getRollInfo>>["equipped"]>;
  lang: "ru" | "en";
}) {
  const { t } = useTranslation();
  const mods = (equipped.modifiers ?? []) as Mod[];
  return (
    <div className="glass-card flex flex-wrap items-center gap-4 rounded-2xl p-4">
      <div
        className={`grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br ${RARITY_GRADIENT[equipped.rarity as Rarity]} ${RARITY_GLOW[equipped.rarity as Rarity]}`}
      >
        {equipped.image_url ? (
          <img src={equipped.image_url} alt={equipped.name} className="h-[72px] w-[72px] rounded-xl object-cover" />
        ) : (
          <span className="text-3xl">🧠</span>
        )}
      </div>
      <div className="flex-1">
        <div className="text-lg font-black">{equipped.name}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {RARITY_LABELS[equipped.rarity as Rarity][lang]}
        </div>
        <div className="mt-2">
          <div className="text-xs text-muted-foreground">{t("roll.current")}</div>
          {mods.length === 0 ? (
            <div className="text-xs italic text-muted-foreground">{t("roll.none")}</div>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              {mods.map((m, i) => (
                <ModChip key={i} mod={m} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModChip({ mod, compact }: { mod: Mod; lang: "ru" | "en"; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br ${TIER_GRADIENT[mod.tier]} ${compact ? "" : TIER_GLOW[mod.tier]} px-2 py-0.5 text-[11px] font-bold text-white`}
    >
      <span className="opacity-80">{t(`roll.tier.${mod.tier}`)}</span>
      <span>·</span>
      <span>{t(`roll.type.${mod.type}`)}</span>
      <span>×{mod.mult.toFixed(2)}</span>
    </span>
  );
}

const REEL = ["weak", "common", "strong", "mythic", "godly", "divine"] as const;

function RollMachine({
  spinning,
  mods,
  lang,
}: {
  spinning: boolean;
  mods: Mod[] | null;
  lang: "ru" | "en";
}) {
  const reels = useMemo(() => [0, 1, 2], []);
  return (
    <div className="grid grid-cols-3 gap-3">
      {reels.map((i) => {
        const mod = mods?.[i];
        return (
          <div
            key={i}
            className="relative h-28 overflow-hidden rounded-2xl border border-border/50 bg-background/40"
          >
            <AnimatePresence mode="wait">
              {spinning ? (
                <motion.div
                  key="spin"
                  initial={{ y: 0 }}
                  animate={{ y: [0, -800] }}
                  transition={{ duration: 1.6, ease: "easeOut", delay: i * 0.1 }}
                  className="absolute inset-x-0 top-0 flex flex-col items-center"
                >
                  {Array.from({ length: 24 }).map((_, k) => {
                    const tier = REEL[k % REEL.length];
                    return (
                      <div
                        key={k}
                        className={`my-1 h-10 w-24 rounded-lg bg-gradient-to-br ${TIER_GRADIENT[tier]} grid place-items-center text-xs font-black text-white`}
                      >
                        {tier.toUpperCase()}
                      </div>
                    );
                  })}
                </motion.div>
              ) : mod ? (
                <motion.div
                  key="result"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 grid place-items-center"
                >
                  <ModChip mod={mod} lang={lang} />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 grid place-items-center text-xs text-muted-foreground"
                >
                  ?
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}