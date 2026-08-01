CREATE OR REPLACE FUNCTION public.record_sms_usage(_user_id uuid, _sent integer, _delivered integer, _failed integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sms_balances
     SET total_sent = total_sent + GREATEST(COALESCE(_sent,0),0),
         total_delivered = total_delivered + GREATEST(COALESCE(_delivered,0),0),
         total_failed = total_failed + GREATEST(COALESCE(_failed,0),0),
         updated_at = now()
   WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_sms_usage(uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_sms_usage(uuid, integer, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_api_key(_key_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT user_id INTO uid FROM public.api_keys
   WHERE key_hash = _key_hash AND revoked_at IS NULL
   LIMIT 1;
  IF uid IS NOT NULL THEN
    UPDATE public.api_keys SET last_used_at = now() WHERE key_hash = _key_hash;
  END IF;
  RETURN uid;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_api_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_api_key(text) TO service_role;