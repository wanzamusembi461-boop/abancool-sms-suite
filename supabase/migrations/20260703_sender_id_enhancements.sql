-- Enhance sender_ids table for better marketplace management
ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS network TEXT;
ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS document_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS invoice_url TEXT;
ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS marketplace_id TEXT;
ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS is_marketplace_purchase BOOLEAN DEFAULT false;

-- Create sender_id_marketplace table for admin configuration
CREATE TABLE IF NOT EXISTS public.sender_id_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  network TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL,
  rating NUMERIC DEFAULT 4.9,
  sales_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed marketplace with default providers
INSERT INTO public.sender_id_marketplace (name, network, price, rating, sales_count)
VALUES 
  ('Safaricom Official', 'safaricom', 7500, 4.9, 150),
  ('Airtel Kenya', 'airtel', 7500, 4.8, 120),
  ('Telkom Kenya', 'telkom', 7500, 4.7, 95)
ON CONFLICT (network) DO UPDATE SET updated_at = now();

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.sender_id_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_id_request_id UUID NOT NULL REFERENCES public.sender_ids(id),
  invoice_number TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  network TEXT NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create RLS policies
ALTER TABLE public.sender_id_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sender_id_invoices ENABLE ROW LEVEL SECURITY;

-- Allow public to read marketplace
CREATE POLICY "Public can read marketplace" ON public.sender_id_marketplace
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Allow users to read their own invoices
CREATE POLICY "Users can read own invoices" ON public.sender_id_invoices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow admin to read all invoices
CREATE POLICY "Admin can read all invoices" ON public.sender_id_invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
