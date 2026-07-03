-- =========================================================
-- SESSION 2: M-PESA INTEGRATION
-- =========================================================

-- 1. Add UPDATE policy for transactions (for edge functions)
CREATE POLICY "tx_edge_update" ON public.transactions 
  FOR UPDATE TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 2. Create credit_sms RPC function (atomic SMS credit)
CREATE OR REPLACE FUNCTION public.credit_sms(_user_id UUID, _amount INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.sms_balances
  SET paid_sms = paid_sms + _amount,
      updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- 3. Create deduct_sms RPC function (atomic SMS deduction)
CREATE OR REPLACE FUNCTION public.deduct_sms(_user_id UUID, _amount INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.sms_balances
  SET paid_sms = GREATEST(0, paid_sms - _amount),
      updated_at = now()
  WHERE user_id = _user_id
  AND (paid_sms + free_sms >= _amount);
  
  RETURN FOUND;
END;
$$;

-- 4. Create unique index on pending transactions (prevents duplicate checkouts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_checkout_pending 
  ON public.transactions(mpesa_checkout_id) 
  WHERE status = 'pending';

