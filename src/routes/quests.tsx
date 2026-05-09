import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, Gift, Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getQuests, claimQuest, getStats } from "@/functions/quests.functions";
import { formatBToken } from "@/lib/format";

export const Route = createFileRoute("/quests")({
  component: () => (
    <AppShell>
      <QuestsPage />
    </AppShell>
  ),
});

const DIFF_GRADIENT = ["from-emerald-400 to-emerald-600", "from-emerald-400 to-emerald-600", "from-sky-400 to-blue-600", "from-fuchsia-400 to-purple-600", "from-amber-300 to-orange-500"] as const;

function QuestsPage() {
  const { t, i18n } = useTranslation();
  const fetchQuests = useServerFn(getQuests);
  const fetchStats = useServerFn(getStats);
  const claimFn = useServerFn(claimQuest);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["quests"],
    queryFn: () => fetchQuests(),
    refetchInterval: 5000,
  });
  const { data: stats } = useQuery({
    queryKey: ["stats", "quest-bonus"],
    queryFn: () => fetchStats(),
  });

  const claim = useMutation({
    mutationFn: (id: string) => claimFn({ data: { quest_id: id } }),
    onSuccess: (res) => {
      toast.success(`+${formatBToken(res.reward)} BToken`);
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["user_state"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast.error("Error"),
  });

  const lang = i18n.language.startsWith("ru") ? "ru" : "en";
  const bonusPct = Math.round(((stats?.derived?.questBonus ?? 0) * 100));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-glow">{t("quests.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("quests.subtitle")}</p>
        {bonusPct > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {t("quests.bonus", { p: bonusPct })}
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !data?.quests?.length ? (
        <p className="py-12 text-center text-muted-foreground">{t("quests.empty")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.quests.map((q, i) => {
            const pct = Math.min(100, (q.progress / q.target) * 100);
            const ready = q.progress >= q.target && !q.claimed;
            const grad = DIFF_GRADIENT[Math.min(DIFF_GRADIENT.length - 1, q.difficulty)];
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card relative overflow-hidden rounded-2xl border p-4 ${q.claimed ? "opacity-60" : ""}`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${grad}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(`quests.kind.${q.kind}`)}
                    </p>
                    <h3 className="text-lg font-bold leading-tight">{lang === "ru" ? q.title_ru : q.title_en}</h3>
                  </div>
                  <div className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    +{formatBToken(q.reward)}
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <Progress value={pct} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatBToken(q.progress)} / {formatBToken(q.target)}</span>
                    <span>
                      {q.claimed ? t("quests.claimed") : ready ? t("quests.ready") : t("quests.in_progress")}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  {q.claimed ? (
                    <Button disabled className="w-full" variant="secondary">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> {t("quests.claimed")}
                    </Button>
                  ) : (
                    <Button
                      disabled={!ready || claim.isPending}
                      onClick={() => claim.mutate(q.id)}
                      className="w-full"
                    >
                      <Gift className="mr-2 h-4 w-4" /> {t("quests.claim")}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
