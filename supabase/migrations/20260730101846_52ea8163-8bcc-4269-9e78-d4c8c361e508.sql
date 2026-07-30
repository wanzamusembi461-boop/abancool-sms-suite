ALTER TABLE public.sender_ids ADD COLUMN IF NOT EXISTS network TEXT, ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.sender_id_marketplace ADD COLUMN IF NOT EXISTS network TEXT;