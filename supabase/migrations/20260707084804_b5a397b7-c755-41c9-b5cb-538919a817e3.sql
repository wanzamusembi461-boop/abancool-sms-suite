
-- 1) Admin can read all profiles
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
CREATE POLICY "profiles_admin_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Seed ABAN_COOL sender for all existing users
INSERT INTO public.sender_ids (user_id, sender_id, business_name, purpose, status)
SELECT p.id, 'ABAN_COOL', 'Abancool Tech', 'Default shared platform sender', 'active'
FROM public.profiles p
ON CONFLICT DO NOTHING;

-- 3) Extend handle_new_user to also grant ABAN_COOL as default sender
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, business_name, phone, country)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'country', 'KE')
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  INSERT INTO public.wallets (user_id, balance_kes) VALUES (NEW.id, 0);
  INSERT INTO public.sms_balances (user_id, paid_sms, free_sms, free_sms_granted)
    VALUES (NEW.id, 0, 5, TRUE);

  INSERT INTO public.sender_ids (user_id, sender_id, business_name, purpose, status)
    VALUES (NEW.id, 'ABAN_COOL', 'Abancool Tech', 'Default shared platform sender', 'active');

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (NEW.id, 'Welcome to Abancool Tech',
          'Your account has been created. You received 5 free SMS and the ABAN_COOL sender ID to get started.', 'success');

  RETURN NEW;
END;
$function$;
