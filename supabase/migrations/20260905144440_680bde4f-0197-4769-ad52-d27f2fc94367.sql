CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  business_name text,
  phone text,
  created_at timestamptz,
  role text,
  paid_sms integer,
  free_sms integer,
  total_sent integer,
  total_delivered integer,
  wallet_kes numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.business_name,
    p.phone,
    p.created_at,
    COALESCE((SELECT r.role::text FROM public.user_roles r WHERE r.user_id = p.id ORDER BY (r.role = 'admin') DESC LIMIT 1), 'customer') AS role,
    COALESCE(b.paid_sms, 0),
    COALESCE(b.free_sms, 0),
    COALESCE(b.total_sent, 0),
    COALESCE(b.total_delivered, 0),
    COALESCE(w.balance_kes, 0)
  FROM public.profiles p
  LEFT JOIN public.sms_balances b ON b.user_id = p.id
  LEFT JOIN public.wallets w ON w.user_id = p.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;