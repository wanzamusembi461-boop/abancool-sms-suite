
-- 1. Add missing columns to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS sender_id_market_id uuid;

-- 2. credit_sms RPC: atomically add paid SMS to a user's balance
CREATE OR REPLACE FUNCTION public.credit_sms(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _amount <= 0 THEN RETURN; END IF;
  INSERT INTO public.sms_balances (user_id, paid_sms, free_sms, free_sms_granted)
  VALUES (_user_id, _amount, 0, FALSE)
  ON CONFLICT (user_id) DO UPDATE
    SET paid_sms = public.sms_balances.paid_sms + EXCLUDED.paid_sms,
        updated_at = now();
END;
$$;

-- 3. deduct_sms RPC: atomically remove SMS (free first, then paid) and return true if sufficient
CREATE OR REPLACE FUNCTION public.deduct_sms(_user_id uuid, _amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal RECORD;
  from_free INT := 0;
  from_paid INT := 0;
  remaining INT := _amount;
BEGIN
  IF _amount <= 0 THEN RETURN TRUE; END IF;
  SELECT * INTO bal FROM public.sms_balances WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF (bal.free_sms + bal.paid_sms) < _amount THEN RETURN FALSE; END IF;
  from_free := LEAST(bal.free_sms, remaining);
  remaining := remaining - from_free;
  from_paid := remaining;
  UPDATE public.sms_balances
    SET free_sms = free_sms - from_free,
        paid_sms = paid_sms - from_paid,
        updated_at = now()
    WHERE user_id = _user_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_sms(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_sms(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_sms(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_sms(uuid, integer) TO service_role;

-- 4. Sender ID Marketplace (admin-managed pricing)
CREATE TABLE IF NOT EXISTS public.sender_id_marketplace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  description text,
  price_kes numeric(14,2) NOT NULL,
  rating numeric(3,2) DEFAULT 5.0,
  sales_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sender_id_marketplace TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sender_id_marketplace TO authenticated;
GRANT ALL ON public.sender_id_marketplace TO service_role;

ALTER TABLE public.sender_id_marketplace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_public_read" ON public.sender_id_marketplace
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "marketplace_admin_manage" ON public.sender_id_marketplace
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_marketplace_updated BEFORE UPDATE ON public.sender_id_marketplace
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial marketplace items
INSERT INTO public.sender_id_marketplace (name, code, description, price_kes, sort_order) VALUES
  ('INFO', 'INFO', 'Generic info sender ID — approved on all Kenyan carriers', 5000, 1),
  ('ALERTS', 'ALERTS', 'For alerts and notifications', 5000, 2),
  ('PROMO', 'PROMO', 'For promotional messages', 5000, 3)
ON CONFLICT DO NOTHING;

-- 5. Admin can read all campaigns and contacts (for oversight)
DROP POLICY IF EXISTS "campaigns_owner_or_admin_read" ON public.campaigns;
CREATE POLICY "campaigns_owner_or_admin_read" ON public.campaigns
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "contacts_owner_or_admin_read" ON public.contacts;
CREATE POLICY "contacts_owner_or_admin_read" ON public.contacts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
