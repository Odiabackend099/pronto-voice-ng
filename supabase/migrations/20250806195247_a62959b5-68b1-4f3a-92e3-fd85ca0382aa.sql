-- Fix search_path security warning for cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete performance metrics older than 90 days
  DELETE FROM public.performance_metrics 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete error logs older than 180 days
  DELETE FROM public.error_logs 
  WHERE created_at < NOW() - INTERVAL '180 days';
  
  -- Delete security audit logs older than 365 days
  DELETE FROM public.security_audit_log 
  WHERE created_at < NOW() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;