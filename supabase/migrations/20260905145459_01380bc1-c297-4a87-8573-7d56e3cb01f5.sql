REVOKE EXECUTE ON FUNCTION public.admin_debit_sms(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_credit_sms(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon;