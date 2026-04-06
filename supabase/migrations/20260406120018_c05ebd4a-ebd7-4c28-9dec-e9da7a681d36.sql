ALTER TABLE public.prospects 
  ADD COLUMN IF NOT EXISTS call_center_queued boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS call_priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS call_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS called_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS called_by uuid,
  ADD COLUMN IF NOT EXISTS call_notes text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Morocco';