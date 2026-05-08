-- ============= ENUMS =============
CREATE TYPE public.rarity AS ENUM ('common','uncommon','rare','epic','mythic','legendary','secret');
CREATE TYPE public.shop_type AS ENUM ('brainrot','pet');
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

-- ============= CATALOGS =============
CREATE TABLE public.brainrots_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  rarity public.rarity NOT NULL,
  base_click numeric(40,4) NOT NULL DEFAULT 1,
  base_passive numeric(40,4) NOT NULL DEFAULT 0,
  base_price numeric(40,0) NOT NULL DEFAULT 0,
  sell_price numeric(40,0) NOT NULL DEFAULT 0,
  theme_set text,
  image_url text,
  is_starter boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pets_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  rarity public.rarity NOT NULL,
  click_bonus numeric(8,4) NOT NULL DEFAULT 0,
  passive_bonus numeric(8,4) NOT NULL DEFAULT 0,
  luck_bonus numeric(8,4) NOT NULL DEFAULT 0,
  quest_bonus numeric(8,4) NOT NULL DEFAULT 0,
  base_price numeric(40,0) NOT NULL DEFAULT 0,
  sell_price numeric(40,0) NOT NULL DEFAULT 0,
  theme_set text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quests_catalog (
  id text PRIMARY KEY,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  kind text NOT NULL,
  target_value numeric(40,0) NOT NULL DEFAULT 1,
  target_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_btoken numeric(40,0) NOT NULL DEFAULT 1000,
  difficulty int NOT NULL DEFAULT 1
);

-- ============= USER DATA =============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL UNIQUE,
  nickname_lower text NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{"sound":true,"music":true,"language":"ru","theme":"dark"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.profiles (nickname_lower);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.user_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  btoken numeric(40,0) NOT NULL DEFAULT 0,
  total_clicks bigint NOT NULL DEFAULT 0,
  total_earned numeric(40,0) NOT NULL DEFAULT 0,
  best_roll_multiplier numeric(8,4) NOT NULL DEFAULT 1,
  last_passive_tick timestamptz NOT NULL DEFAULT now(),
  last_click_window_start timestamptz NOT NULL DEFAULT now(),
  last_click_window_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_brainrots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brainrot_id text NOT NULL REFERENCES public.brainrots_catalog(id),
  modifiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  rolls_used int NOT NULL DEFAULT 0,
  acquired_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_brainrots (user_id);

CREATE TABLE public.user_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id text NOT NULL REFERENCES public.pets_catalog(id),
  acquired_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_pets (user_id);

CREATE TABLE public.user_loadout (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  equipped_brainrot uuid REFERENCES public.user_brainrots(id) ON DELETE SET NULL,
  pet_slot_1 uuid REFERENCES public.user_pets(id) ON DELETE SET NULL,
  pet_slot_2 uuid REFERENCES public.user_pets(id) ON DELETE SET NULL,
  pet_slot_3 uuid REFERENCES public.user_pets(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_shop (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_type public.shop_type NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  refresh_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_type)
);

CREATE TABLE public.user_quests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_date date NOT NULL,
  quests jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (user_id, quest_date)
);

CREATE TABLE public.roll_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_brainrot_id uuid NOT NULL REFERENCES public.user_brainrots(id) ON DELETE CASCADE,
  brainrot_id text NOT NULL,
  result jsonb NOT NULL,
  cost numeric(40,0) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.roll_history (user_id, created_at DESC);

-- ============= SECURITY DEFINER FUNCTIONS =============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit int DEFAULT 100)
RETURNS TABLE (
  nickname text,
  total_earned numeric,
  btoken numeric,
  total_clicks bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.nickname, s.total_earned, s.btoken, s.total_clicks
  FROM public.user_state s
  JOIN public.profiles p ON p.id = s.user_id
  ORDER BY s.total_earned DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
$$;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO anon, authenticated;

-- ============= ENABLE RLS =============
ALTER TABLE public.brainrots_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_brainrots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_loadout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shop ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roll_history ENABLE ROW LEVEL SECURITY;

-- ============= POLICIES =============
CREATE POLICY "catalogs readable" ON public.brainrots_catalog FOR SELECT USING (true);
CREATE POLICY "catalogs readable" ON public.pets_catalog FOR SELECT USING (true);
CREATE POLICY "catalogs readable" ON public.quests_catalog FOR SELECT USING (true);

CREATE POLICY "profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "user_state read own" ON public.user_state FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "ub read own" ON public.user_brainrots FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "up read own" ON public.user_pets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "loadout read own" ON public.user_loadout FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "loadout update own" ON public.user_loadout FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "shop read own" ON public.user_shop FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "quests read own" ON public.user_quests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "roll read own" ON public.roll_history FOR SELECT TO authenticated USING (user_id = auth.uid());