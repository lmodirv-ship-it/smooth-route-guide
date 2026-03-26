
-- إضافة أعمدة البلد والمدينة لجدول المتاجر (بدون حذف أي بيانات)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS city text DEFAULT 'Tanger';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS country text DEFAULT 'المغرب';

-- إضافة عمود البلد لجدول طلبات التوصيل (city موجود بالفعل)
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS country text DEFAULT 'المغرب';

-- إضافة أعمدة المنطقة والبلد والمدينة لجدول طلبات الرحلات
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.zones(id);
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS city text DEFAULT 'Tanger';
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS country text DEFAULT 'المغرب';
