-- Enable realtime for deals table
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;

-- Enable realtime for notification_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs;