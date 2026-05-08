import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isValidNickname, generateAlternatives } from "@/lib/nickname";

const PSEUDO_DOMAIN = "brainrot.local";

function pseudoEmail(nick: string) {
  return `${nick.toLowerCase()}@${PSEUDO_DOMAIN}`;
}

function pseudoPassword(nick: string) {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "salt";
  return `br_${nick.toLowerCase()}_${salt.slice(0, 24)}`;
}

export type SignInResult =
  | {
      ok: true;
      session: { access_token: string; refresh_token: string };
      nickname: string;
    }
  | { ok: false; error: "format" | "profanity" | "server" }
  | { ok: false; error: "taken"; alternatives: string[] };

export async function doSignInOrUp(nick: string): Promise<SignInResult> {
  const valid = isValidNickname(nick);
  if (!valid.ok) return { ok: false, error: valid.reason };

  const lower = nick.toLowerCase();
  const email = pseudoEmail(nick);
  const password = pseudoPassword(nick);

  const signIn = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (signIn.data.session) {
    return {
      ok: true,
      session: {
        access_token: signIn.data.session.access_token,
        refresh_token: signIn.data.session.refresh_token,
      },
      nickname: nick,
    };
  }

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id, nickname")
    .eq("nickname_lower", lower)
    .maybeSingle();
  if (existing) {
    const free: string[] = [];
    for (let i = 0; i < 5 && free.length < 3; i++) {
      const candidates = generateAlternatives(nick);
      for (const c of candidates) {
        if (free.length >= 3) break;
        if (free.includes(c)) continue;
        const { data: hit } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("nickname_lower", c.toLowerCase())
          .maybeSingle();
        if (!hit) free.push(c);
      }
    }
    return { ok: false, error: "taken", alternatives: free };
  }

  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nickname: nick },
  });
  if (created.error || !created.data.user) {
    return { ok: false, error: "server" };
  }
  const userId = created.data.user.id;

  await supabaseAdmin.from("profiles").insert({
    id: userId,
    nickname: nick,
    nickname_lower: lower,
  });
  await supabaseAdmin.from("user_state").insert({ user_id: userId });
  await supabaseAdmin.from("user_loadout").insert({ user_id: userId });

  const { data: starter } = await supabaseAdmin
    .from("brainrots_catalog")
    .select("id")
    .eq("is_starter", true)
    .limit(1)
    .maybeSingle();
  if (starter) {
    const { data: ub } = await supabaseAdmin
      .from("user_brainrots")
      .insert({ user_id: userId, brainrot_id: starter.id })
      .select("id")
      .single();
    if (ub) {
      await supabaseAdmin
        .from("user_loadout")
        .update({ equipped_brainrot: ub.id })
        .eq("user_id", userId);
    }
  }

  const fresh = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (!fresh.data.session) return { ok: false, error: "server" };
  return {
    ok: true,
    session: {
      access_token: fresh.data.session.access_token,
      refresh_token: fresh.data.session.refresh_token,
    },
    nickname: nick,
  };
}
