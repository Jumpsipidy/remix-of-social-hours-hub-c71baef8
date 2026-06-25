
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('student', 'school_admin', 'organization', 'admin');

-- Reservation status enum
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'declined');

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role public.app_role NOT NULL DEFAULT 'student',
  associated_school_id UUID,
  hours_needed INTEGER NOT NULL DEFAULT 0,
  hours_earned INTEGER NOT NULL DEFAULT 0,
  organization_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- has_role helper (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role)
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup, reading metadata from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role public.app_role;
BEGIN
  v_role := COALESCE((meta->>'role')::public.app_role, 'student');

  INSERT INTO public.profiles (id, email, full_name, role, organization_name, hours_needed)
  VALUES (
    NEW.id,
    NEW.email,
    meta->>'full_name',
    v_role,
    meta->>'organization_name',
    COALESCE((meta->>'hours_needed')::int, 0)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- RESERVATIONS
-- =========================
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours_to_earn NUMERIC(5,2) NOT NULL DEFAULT 0,
  status public.reservation_status NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = organization_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can create reservations"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Student or organization can update reservation"
  ON public.reservations FOR UPDATE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = organization_id)
  WITH CHECK (auth.uid() = student_id OR auth.uid() = organization_id);

CREATE POLICY "Student can delete own reservation"
  ON public.reservations FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

CREATE TRIGGER reservations_set_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- CHAT ROOMS
-- =========================
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms TO authenticated;
GRANT ALL ON public.chat_rooms TO service_role;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view chat rooms"
  ON public.chat_rooms FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.uid() = organization_id
    OR auth.uid() = school_admin_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Participants can create chat rooms"
  ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id OR auth.uid() = organization_id);

-- helper to check chat room membership without recursive RLS
CREATE OR REPLACE FUNCTION public.is_chat_room_member(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE id = _room_id
      AND (_user_id = student_id OR _user_id = organization_id OR _user_id = school_admin_id)
  )
$$;

-- =========================
-- MESSAGES
-- =========================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_chat_room_member(chat_room_id, auth.uid()));

CREATE POLICY "Room members can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_chat_room_member(chat_room_id, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
