-- Update packages table to add flexible purchasing

-- 1. Clear existing packages
DELETE FROM public.packages;

-- 2. Reseed with updated pricing (per SMS: 0.5, 0.4, 0.35, 0.3)
INSERT INTO public.packages (name, slug, sms_count, price_per_sms, total_price, description, sort_order, is_active) VALUES
  ('Starter', 'starter', 1000, 0.50, 500.00, 'Perfect for testing and small campaigns', 1, true),
  ('Popular', 'popular', 5000, 0.40, 2000.00, 'Best value for growing businesses', 2, true),
  ('Business', 'business', 10000, 0.35, 3500.00, 'For regular SMS senders', 3, true),
  ('Enterprise', 'enterprise', 50000, 0.30, 15000.00, 'For high-volume senders (50k+)', 4, true);

-- 3. Add flexible purchase column (for custom amounts)
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS allow_custom_amount BOOLEAN DEFAULT true;

-- 4. Update all to allow custom amounts
UPDATE public.packages SET allow_custom_amount = true;

-- 5. Add notes column for sender ID info
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE public.packages 
SET notes = 'Works with all Kenyan carriers (Safaricom 7500 KES, Airtel 7500 KES, Telkom 7500 KES sender IDs)'
WHERE slug IN ('starter', 'popular', 'business', 'enterprise');

