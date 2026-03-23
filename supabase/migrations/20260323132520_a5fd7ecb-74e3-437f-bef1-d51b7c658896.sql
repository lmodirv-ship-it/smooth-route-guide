
-- Create trigger to auto-create profile, role, wallet on new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Allow agents to view all profiles (for call center customer search)
CREATE POLICY "Agents can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'agent'::app_role));
