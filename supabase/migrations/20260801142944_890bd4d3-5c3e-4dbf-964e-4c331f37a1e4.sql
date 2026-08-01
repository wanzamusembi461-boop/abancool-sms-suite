CREATE OR REPLACE FUNCTION public.credit_sms(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sms_balances (user_id, paid_sms, free_sms, total_sent, total_delivered)
  VALUES (_user_id, GREATEST(COALESCE(_amount,0),0), 0, 0, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    paid_sms = sms_balances.paid_sms + GREATEST(COALESCE(_amount,0),0),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.credit_sms(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_sms(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_credit_sms(_user_id uuid, _amount integer, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can credit SMS';
  END IF;
  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  INSERT INTO public.sms_balances (user_id, paid_sms, free_sms, total_sent, total_delivered)
  VALUES (_user_id, _amount, 0, 0, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    paid_sms = sms_balances.paid_sms + _amount,
    updated_at = now();

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (_user_id, 'Admin Credit',
          _amount || ' SMS credited by admin.' || COALESCE(' Reason: ' || _reason, ''), 'info');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_credit_sms(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_credit_sms(uuid, integer, text) TO authenticated, service_role;