import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Coins, Zap, Sparkles } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { getDashboard, processClicks } from "@/functions/game.functions";
import { formatBToken, formatRate } from "@/lib/format";
import { RARITY_GLOW, RARITY_GRADIENT } from "@/lib/rarity";

type Pop = { id: number; x: number; y: number; value: number };

export function Clicker() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const dashFn = useServerFn(getDashboard);
  const clickFn = useServerFn(processClicks);

  const dash = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => dashFn(),
    enabled: !!user,
    refetchInterval: 8000,
  });

  // Local optimistic balance for buttery feedback
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [shake, setShake] = useState(0);
  const popId = useRef(0);
  const queued = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const data = dash.data;
  const clickValue = data?.derived.clickValue ?? 1;
  const passive = data?.derived.passivePerSec ?? 0;
  const serverBalance = data?.state.btoken ?? 0;
  const balance = localBalance ?? serverBalance;

  // Sync local with server when server updates
  useEffect(() => {
    setLocalBalance(serverBalance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverBalance]);

  // Animate passive trickle locally
  useEffect(() => {
    if (!passive) return;
    const id = setInterval(() => {
      setLocalBalance((b) => (b ?? 0) + passive / 10);
    }, 100);
    return () => clearInterval(id);
  }, [passive]);

  function flush() {
    flushTimer.current = null;
    const n = queued.current;
    if (!n) return;
    queued.current = 0;
    clickFn({ data: { count: Math.min(50, n) } })
      .then((res) => {
        setLocalBalance(res.btoken);
        qc.setQueryData(["dashboard", user?.id], (old: typeof data) =>
          old
            ? {
                ...old,
                state: {
                  ...old.state,
                  btoken: res.btoken,
                  total_earned: res.total_earned,
                  total_clicks: res.total_clicks,
                },
              }
            : old
        );
      })
      .catch(() => dash.refetch());
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!data?.loadout.brainrot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPops((p) => [...p.slice(-12), { id: ++popId.current, x, y, value: clickValue }]);
    setLocalBalance((b) => (b ?? 0) + clickValue);
    setShake((s) => s + 1);
    queued.current += 1;
    if (!flushTimer.current) flushTimer.current = setTimeout(flush, 220);
  }

  // Cleanup pops
  useEffect(() => {
    if (!pops.length) return;
    const id = setTimeout(() => setPops((p) => p.slice(1)), 1000);
    return () => clearTimeout(id);
  }, [pops]);

  const br = data?.loadout.brainrot;
  const pets = data?.loadout.pets ?? [];

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Stats row */}
      <div className="grid w-full max-w-md grid-cols-3 gap-2">
        <StatCard icon={<Coins className="h-4 w-4" />} label={t("game.balance")} value={formatBToken(balance)} accent="text-primary" />
        <StatCard icon={<Zap className="h-4 w-4" />} label={t("game.cps")} value={`+${formatBToken(clickValue)}`} accent="text-accent" />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label={t("game.passive")} value={passive ? formatRate(passive) : "—"} accent="text-emerald-400" />
      </div>

      {/* Main scene */}
      <div className="relative flex h-[360px] w-full max-w-md items-center justify-center">
        {br ? (
          <button
            onClick={handleClick}
            className="group relative outline-none"
            aria-label={t("game.click")}
          >
            <motion.div
              key={shake}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 0.92, 1.04, 1] }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`relative grid h-64 w-64 place-items-center rounded-full bg-gradient-to-br ${RARITY_GRADIENT[br.rarity]} ${RARITY_GLOW[br.rarity]} animate-pulse-glow`}
            >
              {br.image_url ? (
                <img
                  src={br.image_url}
                  alt={br.name}
                  className="h-56 w-56 select-none rounded-full object-cover"
                  draggable={false}
                />
              ) : (
                <span className="text-8xl select-none">🧠</span>
              )}
            </motion.div>

            {/* Pets on shoulders */}
            <div className="pointer-events-none absolute inset-0">
              {pets.slice(0, 3).map((p, i) => {
                const positions = [
                  { top: "5%", left: "-8%" },
                  { top: "-5%", right: "30%" },
                  { top: "5%", right: "-8%" },
                ];
                return (
                  <motion.div
                    key={p.id}
                    initial={{ y: 0 }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 1.6 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute h-16 w-16 rounded-full bg-gradient-to-br ${RARITY_GRADIENT[p.rarity]} ${RARITY_GLOW[p.rarity]} grid place-items-center`}
                    style={positions[i]}
                    title={p.name}
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <span className="text-2xl">🐾</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Floating +X */}
            <AnimatePresence>
              {pops.map((p) => (
                <motion.span
                  key={p.id}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -90, scale: 1.4 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="pointer-events-none absolute z-10 select-none text-2xl font-black text-primary text-glow"
                  style={{ left: p.x, top: p.y }}
                >
                  +{formatBToken(p.value)}
                </motion.span>
              ))}
            </AnimatePresence>
          </button>
        ) : (
          <div className="glass-card grid h-64 w-64 place-items-center rounded-full text-center text-sm text-muted-foreground">
            {t("game.none_equipped")}
          </div>
        )}
      </div>

      {/* Equipped info */}
      {br && (
        <div className="glass-card flex w-full max-w-md flex-col gap-1 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("game.equipped")}</span>
            <span className="text-xs uppercase tracking-wider text-primary">{br.rarity}</span>
          </div>
          <div className="text-lg font-bold">{br.name}</div>
          {data?.derived.synergies.full && (
            <div className="text-xs text-amber-400">★ Полный сет ({br.theme_set})</div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-0.5 rounded-xl px-2 py-2">
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground`}>
        {icon}
        {label}
      </div>
      <div className={`text-base font-black ${accent}`}>{value}</div>
    </div>
  );
}
