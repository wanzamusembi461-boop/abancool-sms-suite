
REVOKE ALL ON FUNCTION public.credit_sms(uuid, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.deduct_sms(uuid, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
