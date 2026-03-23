
-- Create ride_messages table for driver-client chat
CREATE TABLE public.ride_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages for their own rides
CREATE POLICY "Users can view ride messages"
ON public.ride_messages FOR SELECT TO authenticated
USING (
  ride_id IN (
    SELECT id FROM public.ride_requests WHERE user_id = auth.uid() OR driver_id = auth.uid()
  )
);

-- Users can insert messages for their own rides
CREATE POLICY "Users can send ride messages"
ON public.ride_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  ride_id IN (
    SELECT id FROM public.ride_requests WHERE user_id = auth.uid() OR driver_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;
