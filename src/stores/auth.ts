import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  session: Session | null;
  nickname: string | null;
  loading: boolean;
  init: () => Promise<void>;
  setSession: (session: Session | null, nickname: string | null) => void;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      nickname: null,
      loading: true,
      async init() {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) {
          set({ user: null, session: null, nickname: null, loading: false });
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", session.user.id)
          .maybeSingle();
        set({
          user: session.user,
          session,
          nickname: profile?.nickname ?? null,
          loading: false,
        });
        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (!newSession) {
            set({ user: null, session: null, nickname: null });
            return;
          }
          const { data: prof } = await supabase
            .from("profiles")
            .select("nickname")
            .eq("id", newSession.user.id)
            .maybeSingle();
          set({ user: newSession.user, session: newSession, nickname: prof?.nickname ?? null });
        });
      },
      setSession(session, nickname) {
        set({ session, user: session?.user ?? null, nickname });
      },
      async logout() {
        await supabase.auth.signOut();
        set({ user: null, session: null, nickname: null });
      },
    }),
    { name: "brainrot-auth", partialize: (s) => ({ nickname: s.nickname }) }
  )
);
