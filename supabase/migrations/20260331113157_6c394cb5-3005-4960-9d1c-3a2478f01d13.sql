
-- Function to list public tables
CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT array_agg(table_name::text ORDER BY table_name)
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
$$;

-- Function to get table columns
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table text)
RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT c.column_name::text, c.data_type::text, c.is_nullable::text, c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = p_table
  ORDER BY c.ordinal_position;
$$;
