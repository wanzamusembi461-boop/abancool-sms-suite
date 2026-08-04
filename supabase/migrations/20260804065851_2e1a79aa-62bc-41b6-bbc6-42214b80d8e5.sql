ALTER TABLE public.sms_balances REPLICA IDENTITY FULL;
ALTER TABLE public.sms_logs REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_balances; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;