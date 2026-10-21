ALTER TABLE public.reservations ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN end_time DROP NOT NULL;