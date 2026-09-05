CREATE OR REPLACE FUNCTION public.admin_debit_sms(_user_id uuid, _amount integer, _reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bal RECORD;
  from_paid INT := 0;
  from_free INT := 0;
  remaining INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can remove SMS';
  END IF;
  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT * INTO bal FROM public.sms_balances WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User has no SMS balance';
  END IF;

  remaining := LEAST(_amount, bal.paid_sms + bal.free_sms);
  from_paid := LEAST(bal.paid_sms, remaining);
  remaining := remaining - from_paid;
  from_free := remaining;

  UPDATE public.sms_balances
     SET paid_sms = paid_sms - from_paid,
         free_sms = free_sms - from_free,
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (_user_id, 'SMS Adjustment',
          (from_paid + from_free) || ' SMS removed by admin.' || COALESCE(' Reason: ' || _reason, ''), 'warning');
END;
$function$;