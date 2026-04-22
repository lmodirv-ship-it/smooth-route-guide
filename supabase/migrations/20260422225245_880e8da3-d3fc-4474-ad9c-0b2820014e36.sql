-- 1) Allow users to delete/update their own voice order files
CREATE POLICY "Users can update own voice orders"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'voice-orders' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'voice-orders' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own voice orders"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'voice-orders' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2) Rate-limit anonymous contact form submissions via trigger
CREATE OR REPLACE FUNCTION public.rate_limit_contact_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count int;
BEGIN
  -- Block if same email submitted >3 messages in the last 10 minutes
  SELECT COUNT(*) INTO v_recent_count
  FROM public.hn_stock_contact_messages
  WHERE email = NEW.email
    AND created_at > now() - interval '10 minutes';

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'too_many_submissions_please_wait';
  END IF;

  -- Basic length validation (defence in depth)
  IF length(COALESCE(NEW.message, '')) > 5000 THEN
    RAISE EXCEPTION 'message_too_long';
  END IF;
  IF length(COALESCE(NEW.name, '')) > 200 THEN
    RAISE EXCEPTION 'name_too_long';
  END IF;
  IF length(COALESCE(NEW.subject, '')) > 300 THEN
    RAISE EXCEPTION 'subject_too_long';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rate_limit_contact_messages ON public.hn_stock_contact_messages;
CREATE TRIGGER trg_rate_limit_contact_messages
BEFORE INSERT ON public.hn_stock_contact_messages
FOR EACH ROW
EXECUTE FUNCTION public.rate_limit_contact_messages();