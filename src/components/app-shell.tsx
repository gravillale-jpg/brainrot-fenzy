import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Coins } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { ThemeToggle, LanguageToggle } from "@/components/toggles";
import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatBToken } from "@/lib/format";
import "@/lib/i18n";

const NAV = [
  { to: "/", key: "game" as const },
  { to: "/inventory", key: "inventory" as const },
  { to: "/shop", key: "shop" as const },
  { to: "/quests", key: "quests" as const },
  { to: "/leaderboard", key: "leaderboard" as const },
  { to: "/stats", key: "stats" as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, nickname, loading, init, logout } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    init();
  }, [init]);

  const { data: state } = useQuery({
    queryKey: ["user_state", user?.id],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_state")
        .select("btoken,total_clicks,total_earned")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-primary/30" />
      </div>
    );
  }
  if (!user || !nickname) return <AuthGate />;

  return (
    <div className="min-h-screen">
      <header className="glass-card sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-black text-glow">
            🧠 Brainrot
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => {
              const active = pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(`nav.${n.key}`)}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary md:flex">
              <Coins className="h-4 w-4" />
              {formatBToken(Number(state?.btoken ?? 0))}
            </div>
            <span className="hidden text-sm font-medium md:inline">{nickname}</span>
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <nav className="flex justify-center gap-1 border-t border-border/40 px-2 py-2 md:hidden">
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  active ? "bg-primary/20 text-primary" : "text-muted-foreground"
                }`}
              >
                {t(`nav.${n.key}`)}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
