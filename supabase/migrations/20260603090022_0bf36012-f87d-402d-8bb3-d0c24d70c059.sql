
-- =========================================================================
-- 1) tenants
-- =========================================================================
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  logo_url text,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','archived')),
  primary_color text NOT NULL DEFAULT 'oklch(0.62 0.19 256)',
  secondary_color text NOT NULL DEFAULT 'oklch(0.72 0.15 180)',
  welcome_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2) tenant_members
-- =========================================================================
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'student' CHECK (role IN ('tenant_admin','teacher','student')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3) tenant_invitations
-- =========================================================================
CREATE TABLE public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'student' CHECK (role IN ('tenant_admin','teacher','student')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenant_invitations_email ON public.tenant_invitations(lower(email));
CREATE INDEX idx_tenant_invitations_tenant ON public.tenant_invitations(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_invitations TO authenticated;
GRANT ALL ON public.tenant_invitations TO service_role;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 4) Add tenant_id columns
-- =========================================================================
ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN active_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.announcements ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.moderation_reports ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.ai_usage_logs ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.system_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- =========================================================================
-- 5) Seed tenants
-- =========================================================================
INSERT INTO public.tenants (slug, name, description, primary_color, secondary_color, welcome_message) VALUES
  ('flexymentor', 'FlexyMentor', 'Organisation principale FlexyMentor', 'oklch(0.62 0.19 256)', 'oklch(0.72 0.15 180)', 'Bienvenue sur FlexyMentor'),
  ('alpha-school', 'Alpha School', 'Établissement secondaire — démo', 'oklch(0.55 0.20 250)', 'oklch(0.70 0.16 200)', 'Bienvenue à Alpha School'),
  ('beta-university', 'Beta University', 'Université scientifique — démo', 'oklch(0.58 0.18 150)', 'oklch(0.72 0.14 130)', 'Bienvenue à Beta University'),
  ('gamma-training', 'Gamma Training Center', 'Centre de formation professionnelle — démo', 'oklch(0.65 0.20 50)', 'oklch(0.75 0.15 80)', 'Bienvenue au Gamma Training Center');

-- Backfill
DO $$
DECLARE v_tenant uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.tenants WHERE slug = 'flexymentor';
  UPDATE public.profiles SET tenant_id = v_tenant, active_tenant_id = v_tenant WHERE tenant_id IS NULL;
  UPDATE public.announcements SET tenant_id = v_tenant WHERE tenant_id IS NULL;
  UPDATE public.subscriptions SET tenant_id = v_tenant WHERE tenant_id IS NULL;
  UPDATE public.moderation_reports SET tenant_id = v_tenant WHERE tenant_id IS NULL;
  UPDATE public.ai_usage_logs SET tenant_id = v_tenant WHERE tenant_id IS NULL;
  UPDATE public.system_settings SET tenant_id = v_tenant WHERE tenant_id IS NULL;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  SELECT v_tenant, p.id, 'tenant_admin'::public.app_role
  FROM public.profiles p
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
END$$;

ALTER TABLE public.announcements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.moderation_reports ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.ai_usage_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.system_settings ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_announcements_tenant ON public.announcements(tenant_id);
CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_moderation_reports_tenant ON public.moderation_reports(tenant_id);
CREATE INDEX idx_ai_usage_logs_tenant ON public.ai_usage_logs(tenant_id);
CREATE INDEX idx_system_settings_tenant ON public.system_settings(tenant_id);

-- system_settings is per-tenant
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE public.system_settings ADD PRIMARY KEY (tenant_id, key);

-- =========================================================================
-- 6) Helpers
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = 'tenant_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.tenant_role(_user_id uuid, _tenant_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.tenant_members
  WHERE user_id = _user_id AND tenant_id = _tenant_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1)
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;

-- =========================================================================
-- 7) RLS — tenants
-- =========================================================================
CREATE POLICY "Members view their tenants" ON public.tenants FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(auth.uid(), id));
CREATE POLICY "Super admins manage tenants" ON public.tenants FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Tenant admins update their tenant" ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), id)) WITH CHECK (public.is_tenant_admin(auth.uid(), id));
CREATE POLICY "Authenticated users create tenants" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================================
-- 8) RLS — tenant_members
-- =========================================================================
CREATE POLICY "Users view own memberships" ON public.tenant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Tenant admins manage members" ON public.tenant_members FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

-- =========================================================================
-- 9) RLS — tenant_invitations
-- =========================================================================
CREATE POLICY "Tenant admins manage invitations" ON public.tenant_invitations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

-- =========================================================================
-- 10) Rewrite RLS on existing tables
-- =========================================================================
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users view profiles in their tenant" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.is_tenant_member(auth.uid(), tenant_id))
  );
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Tenant admins update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)));
CREATE POLICY "Tenant admins delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id IS NOT NULL AND public.is_tenant_admin(auth.uid(), tenant_id)));

DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone authenticated can read published announcements" ON public.announcements;
CREATE POLICY "Tenant members read announcements" ON public.announcements FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (public.is_tenant_member(auth.uid(), tenant_id) AND (published = true OR public.is_tenant_admin(auth.uid(), tenant_id)))
  );
CREATE POLICY "Tenant admins manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Tenant admins manage subscriptions" ON public.subscriptions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Moderators update reports" ON public.moderation_reports;
DROP POLICY IF EXISTS "Moderators view all reports" ON public.moderation_reports;
DROP POLICY IF EXISTS "Users create reports" ON public.moderation_reports;
DROP POLICY IF EXISTS "Users view own reports" ON public.moderation_reports;
CREATE POLICY "Tenant members create reports" ON public.moderation_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "View own or admin reports" ON public.moderation_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Admins update reports" ON public.moderation_reports FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins view all AI usage" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users view own AI usage" ON public.ai_usage_logs;
CREATE POLICY "Users view own AI usage" ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins manage settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins read settings" ON public.system_settings;
CREATE POLICY "Tenant members read settings" ON public.system_settings FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Tenant admins manage settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

-- =========================================================================
-- 11) Updated handle_new_user
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invitation_token text;
  v_inv RECORD;
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  v_invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  IF v_invitation_token IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.tenant_invitations
      WHERE token = v_invitation_token AND accepted_at IS NULL AND expires_at > now()
      LIMIT 1;
    IF FOUND THEN
      INSERT INTO public.tenant_members (tenant_id, user_id, role)
        VALUES (v_inv.tenant_id, NEW.id, v_inv.role)
        ON CONFLICT DO NOTHING;
      UPDATE public.profiles
        SET tenant_id = v_inv.tenant_id, active_tenant_id = v_inv.tenant_id
        WHERE id = NEW.id;
      UPDATE public.tenant_invitations SET accepted_at = now() WHERE id = v_inv.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 12) Promote dossoabdoul619@gmail.com
-- =========================================================================
DO $$
DECLARE v_user uuid; v_tenant uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE email = 'dossoabdoul619@gmail.com' LIMIT 1;
  SELECT id INTO v_tenant FROM public.tenants WHERE slug = 'flexymentor';
  IF v_user IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'super_admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.tenant_members (tenant_id, user_id, role) VALUES (v_tenant, v_user, 'tenant_admin')
      ON CONFLICT (tenant_id, user_id) DO NOTHING;
    UPDATE public.profiles SET tenant_id = v_tenant, active_tenant_id = v_tenant WHERE id = v_user;
  END IF;
END$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
