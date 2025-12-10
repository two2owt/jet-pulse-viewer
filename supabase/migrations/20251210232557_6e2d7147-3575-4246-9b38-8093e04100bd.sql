-- Create security audit logs table for tracking rate limit violations and suspicious access
CREATE TABLE public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'rate_limit_exceeded', 'suspicious_pattern', 'blocked_request'
  endpoint TEXT NOT NULL, -- 'get-location-density', 'get-movement-paths'
  client_ip TEXT NOT NULL,
  user_agent TEXT,
  request_count INTEGER,
  time_window_seconds INTEGER,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security audit logs"
  ON public.security_audit_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for efficient querying
CREATE INDEX idx_security_audit_logs_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX idx_security_audit_logs_client_ip ON public.security_audit_logs(client_ip);
CREATE INDEX idx_security_audit_logs_event_type ON public.security_audit_logs(event_type);

-- Auto-cleanup logs older than 90 days
CREATE OR REPLACE FUNCTION public.cleanup_old_security_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.security_audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Security audit logs cleanup completed at %', NOW();
END;
$$;