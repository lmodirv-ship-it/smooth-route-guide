
-- RLS policies for the private "user-documents" bucket
-- Files must live under a folder named with the owner's user id: <uid>/filename

DROP POLICY IF EXISTS "user_documents_select_own" ON storage.objects;
DROP POLICY IF EXISTS "user_documents_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "user_documents_update_own" ON storage.objects;
DROP POLICY IF EXISTS "user_documents_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "user_documents_admin_all" ON storage.objects;

CREATE POLICY "user_documents_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "user_documents_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "user_documents_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'user-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'user-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "user_documents_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "user_documents_admin_all"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'user-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'user-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
