-- Add avg_rating to profiles for displaying star ratings next to references
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0;

-- Function to auto-update user avg_rating when a new rating is given
CREATE OR REPLACE FUNCTION public.update_user_avg_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the rated user's avg_rating in profiles
  UPDATE public.profiles
  SET avg_rating = (
    SELECT COALESCE(ROUND(AVG(score)::numeric, 2), 0)
    FROM public.ratings
    WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger on ratings insert
DROP TRIGGER IF EXISTS trg_update_user_avg_rating ON public.ratings;
CREATE TRIGGER trg_update_user_avg_rating
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_user_avg_rating();
