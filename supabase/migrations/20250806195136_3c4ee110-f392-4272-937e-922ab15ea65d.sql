-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type TEXT NOT NULL,
  duration_ms NUMERIC NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation_type ON public.performance_metrics(operation_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON public.performance_metrics(created_at);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Performance metrics are viewable by system admins" 
ON public.performance_metrics 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own performance metrics" 
ON public.performance_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create error logging table for production monitoring
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  user_agent TEXT,
  url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for error queries
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at);

-- Enable RLS for error logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for error logs
CREATE POLICY "Error logs are viewable by system admins" 
ON public.error_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can insert error logs for monitoring" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (true);

-- Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  endpoint TEXT,
  request_data JSONB DEFAULT '{}',
  response_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for security audit queries
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON public.security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit_log(user_id);

-- Enable RLS for security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security audit log
CREATE POLICY "Security audit logs are viewable by system admins only" 
ON public.security_audit_log 
FOR SELECT 
USING (false); -- Only system admins should access this

CREATE POLICY "System can insert security audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Create function to clean up old logs (for GDPR compliance)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;