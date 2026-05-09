import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Crown, Loader2, Medal, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getLeaderboard } from "@/functions/quests.functions";
import { useAuth } from "@/stores/auth";
import { formatBToken } from "@/lib/format";

export const Route = createFileRoute("/leaderboard")({
  component: () => (
    <AppShell>
      <LeaderboardPage />
    </AppShell>
  ),
});

function rankIcon(i: number) {
  if (i === 0) return <Crown className="h-4 w-4 text-amber-400" />;
  if (i === 1) return <Trophy className="h-4 w-4 text-slate-300" />;
  if (i === 2) return <Medal className="h-4 w-4 text-orange-400" />;
  return <span className="w-4 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>;
}

function LeaderboardPage() {
  const { t } = useTranslation();
  const { nickname } = useAuth();
  const fetchBoard = useServerFn(getLeaderboard);
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchBoard(),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-glow">{t("leaderboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("leaderboard.subtitle")}</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !data?.entries.length ? (
        <p className="py-12 text-center text-muted-foreground">{t("leaderboard.empty")}</p>
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl border">
          <div className="grid grid-cols-[60px_1fr_120px_120px_100px] gap-2 border-b border-border/50 bg-muted/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{t("leaderboard.rank")}</span>
            <span>{t("leaderboard.player")}</span>
            <span className="text-right">{t("leaderboard.earned")}</span>
            <span className="text-right">{t("leaderboard.balance")}</span>
            <span className="text-right">{t("leaderboard.clicks")}</span>
          </div>
          <ul>
            {data.entries.map((e, i) => {
              const me = nickname && e.nickname.toLowerCase() === nickname.toLowerCase();
              return (
                <motion.li
                  key={e.nickname + i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.4) }}
                  className={`grid grid-cols-[60px_1fr_120px_120px_100px] items-center gap-2 border-b border-border/40 px-4 py-2.5 text-sm transition-colors ${
                    me ? "bg-primary/15 font-semibold" : i < 3 ? "bg-muted/10" : ""
                  }`}
                >
                  <span className="flex items-center">{rankIcon(i)}</span>
                  <span className="truncate">
                    {e.nickname}
                    {me && <span className="ml-2 rounded-full bg-primary/30 px-2 py-0.5 text-[10px] uppercase text-primary">{t("leaderboard.you")}</span>}
                  </span>
                  <span className="text-right font-mono text-primary">{formatBToken(Number(e.total_earned))}</span>
                  <span className="text-right font-mono">{formatBToken(Number(e.btoken))}</span>
                  <span className="text-right font-mono text-muted-foreground">{formatBToken(Number(e.total_clicks))}</span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
