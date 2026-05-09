import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Coins, MousePointerClick, Sparkles, TrendingUp, Heart, PackageOpen, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getStats } from "@/functions/quests.functions";
import { formatBToken, formatRate } from "@/lib/format";
import { RARITY_GRADIENT, RARITY_LABELS } from "@/lib/rarity";

export const Route = createFileRoute("/stats")({
  component: () => (
    <AppShell>
      <StatsPage />
    </AppShell>
  ),
});

function Card({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="glass-card rounded-2xl border p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatsPage() {
  const { t, i18n } = useTranslation();
  const fetchStats = useServerFn(getStats);
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 5000,
  });
  const lang = i18n.language.startsWith("ru") ? "ru" : "en";

  if (isLoading || !data) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const synergy = data.derived.synergies;
  const synergyPct = Math.round((synergy.rarityBonus + synergy.themeBonus) * 100);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-glow">{t("stats.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("stats.subtitle")}</p>
      </header>

      <div className="glass-card rounded-2xl border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">{t("stats.nickname")}</p>
            <p className="text-2xl font-black text-glow">{data.nickname ?? "—"}</p>
          </div>
          {data.joined_at && (
            <div className="text-right text-xs text-muted-foreground">
              {t("stats.joined")}: {new Date(data.joined_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={<Coins className="h-3.5 w-3.5" />} label={t("stats.balance")} value={formatBToken(data.state.btoken)} />
        <Card icon={<TrendingUp className="h-3.5 w-3.5" />} label={t("stats.total_earned")} value={formatBToken(data.state.total_earned)} />
        <Card icon={<MousePointerClick className="h-3.5 w-3.5" />} label={t("stats.total_clicks")} value={formatBToken(data.state.total_clicks)} />
        <Card icon={<Sparkles className="h-3.5 w-3.5" />} label={t("stats.best_roll")} value={`x${data.state.best_roll_multiplier.toFixed(2)}`} />
        <Card icon={<MousePointerClick className="h-3.5 w-3.5" />} label={t("stats.click_value")} value={formatBToken(data.derived.clickValue)} />
        <Card icon={<TrendingUp className="h-3.5 w-3.5" />} label={t("stats.passive")} value={formatRate(data.derived.passivePerSec)} />
        <Card icon={<Sparkles className="h-3.5 w-3.5" />} label={t("stats.luck")} value={`+${(data.derived.luck * 100).toFixed(0)}%`} />
        <Card icon={<Heart className="h-3.5 w-3.5" />} label={t("stats.quest_bonus")} value={`+${(data.derived.questBonus * 100).toFixed(0)}%`} />
        <Card icon={<PackageOpen className="h-3.5 w-3.5" />} label={t("stats.brainrots_owned")} value={String(data.counts.brainrots)} />
        <Card icon={<Heart className="h-3.5 w-3.5" />} label={t("stats.pets_owned")} value={String(data.counts.pets)} />
        <Card
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label={t("stats.synergy")}
          value={`+${synergyPct}%`}
          hint={synergy.full ? t("stats.full_set") : undefined}
        />
      </div>

      <section className="glass-card rounded-2xl border p-5">
        <h2 className="mb-3 text-lg font-bold">{t("stats.loadout")}</h2>
        {data.loadout.brainrot ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mb-4 rounded-xl bg-gradient-to-br ${RARITY_GRADIENT[data.loadout.brainrot.rarity]} p-[1.5px]`}
          >
            <div className="rounded-[10px] bg-card p-3">
              <div className="flex items-center gap-3">
                {data.loadout.brainrot.image_url ? (
                  <img src={data.loadout.brainrot.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-muted" />
                )}
                <div>
                  <p className="font-bold">{data.loadout.brainrot.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {RARITY_LABELS[data.loadout.brainrot.rarity][lang]}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">{t("stats.no_brainrot")}</p>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          {data.loadout.pets.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          {data.loadout.pets.map((p) => (
            <div key={p.id} className={`rounded-xl bg-gradient-to-br ${RARITY_GRADIENT[p.rarity]} p-[1.5px]`}>
              <div className="flex items-center gap-2 rounded-[10px] bg-card p-2">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-muted" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{RARITY_LABELS[p.rarity][lang]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
