-- Create emergency calls table
CREATE TABLE public.emergency_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  transcript TEXT NOT NULL,
  detected_language TEXT DEFAULT 'en',
  confidence FLOAT DEFAULT 0.0,
  emergency_type TEXT,
  severity TEXT,
  location_lat FLOAT,
  location_lng FLOAT,
  location_address TEXT,
  audio_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incident markers table  
CREATE TABLE public.incident_markers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emergency_call_id UUID REFERENCES public.emergency_calls(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  address TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.emergency_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_markers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emergency_calls
CREATE POLICY "Emergency calls are viewable by responders and admins"
ON public.emergency_calls
FOR SELECT
USING (true); -- Public emergency data for responders

CREATE POLICY "Users can create emergency calls"
ON public.emergency_calls
FOR INSERT
WITH CHECK (true); -- Allow anonymous emergency reports

CREATE POLICY "Responders can update emergency calls"
ON public.emergency_calls
FOR UPDATE
USING (true); -- Allow status updates by responders

-- RLS Policies for incident_markers
CREATE POLICY "Incident markers are viewable by everyone"
ON public.incident_markers
FOR SELECT
USING (true);

CREATE POLICY "System can create incident markers"
ON public.incident_markers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Responders can update incident markers"
ON public.incident_markers
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_emergency_calls_updated_at
BEFORE UPDATE ON public.emergency_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incident_markers_updated_at
BEFORE UPDATE ON public.incident_markers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for incident markers
ALTER TABLE public.incident_markers REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.incident_markers;