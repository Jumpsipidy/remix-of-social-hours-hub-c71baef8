# SQL Reference — visos naujos funkcijos

Šitas failas turi **visus SQL blokus**, kurie buvo pridėti naujausiuose funkcionalumuose. Jei kada nors norėsi atkurti DB iš nulio arba migruoti į kitą Supabase projektą, paleisk juos iš eilės.

**Migracija jau buvo pritaikyta tavo DB automatiškai** — čia tik referencija.

---

## 1. Draugystės sistema (`friendships`)

```sql
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_pair_unique UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Tik tos pačios mokyklos moksleiviai gali siųsti užklausas
CREATE POLICY "friendships insert same school" ON public.friendships FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p1, public.profiles p2
    WHERE p1.id = requester_id AND p2.id = addressee_id
      AND p1.role = 'student' AND p2.role = 'student'
      AND p1.school_id IS NOT NULL AND p1.school_id = p2.school_id
  )
);

CREATE POLICY "friendships select participant" ON public.friendships FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "friendships update participant" ON public.friendships FOR UPDATE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "friendships delete participant" ON public.friendships FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id OR public.has_role(auth.uid(), 'admin'));
```

---

## 2. Grupinės rezervacijos (`reservation_participants`)

```sql
CREATE TABLE IF NOT EXISTS public.reservation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_participants TO authenticated;
GRANT ALL ON public.reservation_participants TO service_role;
ALTER TABLE public.reservation_participants ENABLE ROW LEVEL SECURITY;

-- RLS: matai, jei esi savininkas rezervacijos, org savininkas, arba pakviestas
CREATE POLICY "rp select" ON public.reservation_participants FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.reservations r WHERE r.id = reservation_id
             AND (r.student_id = auth.uid() OR r.organization_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);
```

---

## 3. Tiesioginės žinutės (DM) — auto-ištrinamos po 2 dienų

```sql
CREATE TABLE IF NOT EXISTS public.dm_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dm_rooms_ordered CHECK (user_a < user_b),
  CONSTRAINT dm_rooms_pair_unique UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT ON public.dm_rooms TO authenticated;
GRANT ALL ON public.dm_rooms TO service_role;
ALTER TABLE public.dm_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_rooms select participant" ON public.dm_rooms FOR SELECT TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "dm_rooms insert friends only" ON public.dm_rooms FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_a OR auth.uid() = user_b)
  AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = user_a AND f.addressee_id = user_b)
        OR (f.requester_id = user_b AND f.addressee_id = user_a))
  )
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.dm_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dm_messages_room_idx ON public.dm_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dm_messages_purge_idx ON public.dm_messages(created_at);
GRANT SELECT, INSERT ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_dm_room_member(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dm_rooms
                 WHERE id = _room_id AND (_user_id = user_a OR _user_id = user_b));
$$;

CREATE POLICY "dm_messages select member" ON public.dm_messages FOR SELECT TO authenticated
USING (public.is_dm_room_member(room_id, auth.uid()));

CREATE POLICY "dm_messages insert member" ON public.dm_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_dm_room_member(room_id, auth.uid()));
```

**Realtime + open helper + purge:**

```sql
-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_rooms;

-- Atvirai/sukurk DM kambarį tarp draugų
CREATE OR REPLACE FUNCTION public.open_dm_room(_other UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); a UUID; b UUID; rid UUID;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF me = _other THEN RAISE EXCEPTION 'Cannot DM yourself'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = me AND addressee_id = _other)
        OR (requester_id = _other AND addressee_id = me))
  ) THEN RAISE EXCEPTION 'You must be friends to DM'; END IF;
  IF me < _other THEN a := me; b := _other; ELSE a := _other; b := me; END IF;
  SELECT id INTO rid FROM public.dm_rooms WHERE user_a = a AND user_b = b;
  IF rid IS NULL THEN INSERT INTO public.dm_rooms(user_a, user_b) VALUES (a, b) RETURNING id INTO rid; END IF;
  RETURN rid;
END; $$;
GRANT EXECUTE ON FUNCTION public.open_dm_room(UUID) TO authenticated;

-- 2-day auto-purge
CREATE OR REPLACE FUNCTION public.purge_dm_messages()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.dm_messages WHERE created_at < now() - interval '2 days';
$$;
```

---

## 4. Pasikartojančios užduotys (recurring tasks)

```sql
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none','weekly','biweekly','monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_weekday SMALLINT CHECK (recurrence_weekday BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS recurrence_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS template_source_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_until DATE;

CREATE INDEX IF NOT EXISTS tasks_recurring_idx
  ON public.tasks(recurrence, recurrence_active)
  WHERE recurrence <> 'none';
```

Generatorius (kviečiamas kasdien 03:15 UTC per pg_cron):

```sql
CREATE OR REPLACE FUNCTION public.generate_recurring_tasks() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t RECORD; target_date DATE; created_count INTEGER := 0; i INTEGER; matches BOOLEAN;
BEGIN
  FOR t IN SELECT * FROM public.tasks
           WHERE recurrence <> 'none' AND recurrence_active = true AND template_source_id IS NULL
  LOOP
    FOR i IN 0..14 LOOP
      target_date := CURRENT_DATE + i;
      IF t.recurrence_until IS NOT NULL AND target_date > t.recurrence_until THEN EXIT; END IF;
      matches := false;
      IF t.recurrence = 'weekly' AND EXTRACT(DOW FROM target_date)::INT = t.recurrence_weekday THEN matches := true;
      ELSIF t.recurrence = 'biweekly' AND EXTRACT(DOW FROM target_date)::INT = t.recurrence_weekday
        AND ((target_date - t.task_date) % 14 = 0) THEN matches := true;
      ELSIF t.recurrence = 'monthly' AND EXTRACT(DAY FROM target_date) = EXTRACT(DAY FROM t.task_date) THEN matches := true;
      END IF;
      IF NOT matches THEN CONTINUE; END IF;
      IF EXISTS (SELECT 1 FROM public.tasks WHERE template_source_id = t.id AND task_date = target_date) THEN CONTINUE; END IF;
      INSERT INTO public.tasks (
        organization_id, title, description, task_date, start_time, end_time,
        available_hours, location, spots_total, is_open, is_event,
        created_by, event_host_name, tags, template_source_id, recurrence
      ) VALUES (
        t.organization_id, t.title, t.description, target_date, t.start_time, t.end_time,
        t.available_hours, t.location, t.spots_total, true, t.is_event,
        t.created_by, t.event_host_name, t.tags, t.id, 'none'
      );
      created_count := created_count + 1;
    END LOOP;
  END LOOP;
  RETURN created_count;
END; $$;
```

---

## 5. Gilus sveikatos patikros scan + auto-lockdown

`public.run_deep_health_scan()` — atlieka 18 patikrų (RLS, funkcijos, orphans, purge efektyvumas ir kt.) ir grąžina JSON su `critical_failures` skaičiumi.

`public.auto_lockdown_if_unhealthy()` — kviečia deep scan. Jei kritinių gedimų > 0 **ir** lockdown dar išjungtas, automatiškai įjungia lockdown su kodu `E-4002`.

Šios funkcijos jau egzistuoja tavo DB. Peržiūrėti — SQL editor'yje:
```sql
SELECT public.run_deep_health_scan();
```

---

## 6. pg_cron tvarkaraščiai (aktyvūs dabar)

| Užduotis | Grafikas | Ką daro |
|----------|----------|--------|
| `purge-messages-hourly` | `0 * * * *` | Ištrina žinutes >12 d. |
| `purge-dm-15m` | `*/15 * * * *` | Ištrina DM žinutes >2 d. |
| `recurring-tasks-daily` | `15 3 * * *` | Sugeneruoja pasikartojančias užduotis ateities 14 d. |
| `health-scan-auto` | `*/10 * * * *` | Paleidžia gilų scan + auto-lockdown jei blogai |

Peržiūrėti aktyvias:
```sql
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
```

Peržiūrėti paskutinius vykdymus:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

Sustabdyti kurią nors (jei prireiktų):
```sql
SELECT cron.unschedule('purge-dm-15m');
```

---

## 7. `award_reservation_hours` (jau egzistuoja, primenu)

Kai organizacija patvirtina rezervaciją, ši funkcija:
1. Nustato `status = 'completed'`
2. Prideda `hours_to_earn` prie mokinio `hours_earned`
3. **Ateityje** taip pat išdalins val. visiems `reservation_participants` su `status = 'accepted'` (jau planuota patobulinti)

```sql
SELECT * FROM public.award_reservation_hours('rezervacijos-uuid');
```

---

## Kaip patikrinti, kad viskas veikia

```sql
-- 1. DB objektai
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('friendships','reservation_participants','dm_rooms','dm_messages');

-- 2. Cron jobs
SELECT jobname, active FROM cron.job
WHERE jobname IN ('purge-messages-hourly','purge-dm-15m','recurring-tasks-daily','health-scan-auto');

-- 3. Health scan (turėtų grąžinti "critical_failures": 0)
SELECT public.run_deep_health_scan();
```
