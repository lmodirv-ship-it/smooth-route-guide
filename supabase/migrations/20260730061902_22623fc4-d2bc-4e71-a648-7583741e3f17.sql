DROP POLICY IF EXISTS "Drivers can manage own documents" ON public.documents;

CREATE OR REPLACE FUNCTION public.guard_document_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'غير مصرح بتغيير حالة الوثيقة';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_document_status_trg ON public.documents;
CREATE TRIGGER guard_document_status_trg
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.guard_document_status();

CREATE POLICY "Drivers can view own documents"
ON public.documents FOR SELECT TO authenticated
USING (driver_id IN (SELECT d.id FROM public.drivers d WHERE d.user_id = auth.uid()));

CREATE POLICY "Drivers can upload own documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  driver_id IN (SELECT d.id FROM public.drivers d WHERE d.user_id = auth.uid())
  AND status = 'pending'
);

CREATE POLICY "Drivers can update own pending documents"
ON public.documents FOR UPDATE TO authenticated
USING (
  driver_id IN (SELECT d.id FROM public.drivers d WHERE d.user_id = auth.uid())
)
WITH CHECK (
  driver_id IN (SELECT d.id FROM public.drivers d WHERE d.user_id = auth.uid())
);

CREATE POLICY "Drivers can delete own documents"
ON public.documents FOR DELETE TO authenticated
USING (driver_id IN (SELECT d.id FROM public.drivers d WHERE d.user_id = auth.uid()));