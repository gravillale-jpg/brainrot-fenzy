import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInOrUp } from "@/functions/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/auth";
import { isValidNickname } from "@/lib/nickname";

export function AuthGate() {
  const { t } = useTranslation();
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [alts, setAlts] = useState<string[]>([]);
  const fn = useServerFn(signInOrUp);
  const setSession = useAuth((s) => s.setSession);

  async function tryLogin(name: string) {
    setBusy(true);
    setErr(null);
    setAlts([]);
    try {
      const v = isValidNickname(name);
      if (!v.ok) {
        setErr(v.reason === "format" ? t("auth.invalid") : t("auth.profanity"));
        return;
      }
      const res = await fn({ data: { nickname: name } });
      if (!res.ok) {
        if (res.error === "taken" && "alternatives" in res) {
          setAlts(res.alternatives);
          setErr(t("auth.taken"));
        } else if (res.error === "format") setErr(t("auth.invalid"));
        else if (res.error === "profanity") setErr(t("auth.profanity"));
        else setErr("Server error");
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: res.session.access_token,
        refresh_token: res.session.refresh_token,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      setSession(sess.session ?? null, res.nickname);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass-card w-full max-w-md rounded-3xl p-8"
      >
        <div className="mb-6 text-center">
          <h1 className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-4xl font-black text-transparent text-glow">
            Brainrot Clicker
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            tryLogin(nick.trim());
          }}
          className="space-y-3"
        >
          <Input
            placeholder={t("auth.nickname")}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={20}
            autoFocus
            className="h-12 text-center text-lg"
          />
          <Button type="submit" disabled={busy || nick.length < 3} className="h-12 w-full text-base font-semibold">
            {busy ? t("auth.loading") : t("auth.enter")}
          </Button>
        </form>
        {err && <p className="mt-3 text-center text-sm text-destructive">{err}</p>}
        {alts.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {alts.map((a) => (
              <Button key={a} variant="secondary" size="sm" onClick={() => tryLogin(a)}>
                {a}
              </Button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
