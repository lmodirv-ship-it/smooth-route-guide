CREATE OR REPLACE FUNCTION public.is_internal_chat_member(_chat_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.internal_chat_members WHERE chat_id = _chat_id AND user_id = _user_id);
$$;

DROP POLICY IF EXISTS "Agents can add members" ON public.internal_chat_members;

CREATE POLICY "Members can add participants to their chats"
ON public.internal_chat_members
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role)
  AND (
    (user_id = auth.uid()
      AND NOT EXISTS (SELECT 1 FROM public.internal_chat_members m WHERE m.chat_id = internal_chat_members.chat_id))
    OR public.is_internal_chat_member(chat_id, auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.start_internal_chat(_contact_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _chat uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _contact_id IS NULL OR _contact_id = _me THEN RAISE EXCEPTION 'Invalid contact'; END IF;
  IF NOT (has_role(_me, 'agent'::app_role) OR has_role(_me, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT a.chat_id INTO _chat
  FROM public.internal_chat_members a
  JOIN public.internal_chat_members b ON b.chat_id = a.chat_id AND b.user_id = _contact_id
  WHERE a.user_id = _me
  LIMIT 1;

  IF _chat IS NOT NULL THEN RETURN _chat; END IF;

  INSERT INTO public.internal_chats DEFAULT VALUES RETURNING id INTO _chat;
  INSERT INTO public.internal_chat_members (chat_id, user_id, role)
  VALUES (_chat, _me, 'member'), (_chat, _contact_id, 'member');

  RETURN _chat;
END;
$$;

REVOKE ALL ON FUNCTION public.start_internal_chat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_internal_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_internal_chat_member(uuid, uuid) TO authenticated;