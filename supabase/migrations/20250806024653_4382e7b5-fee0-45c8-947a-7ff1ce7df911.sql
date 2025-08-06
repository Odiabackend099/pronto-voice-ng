-- Fix RLS policies and table structure for public emergency reporting

-- Update emergency_calls table to make user_id nullable (it already is) and add public policies
DROP POLICY IF EXISTS "Emergency calls are viewable by responders and admins" ON emergency_calls;
DROP POLICY IF EXISTS "Responders can update emergency calls" ON emergency_calls;
DROP POLICY IF EXISTS "Users can create emergency calls" ON emergency_calls;

-- Create new policies that allow public access for emergency situations
CREATE POLICY "Anyone can view emergency calls" 
ON emergency_calls 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create emergency calls" 
ON emergency_calls 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update emergency calls" 
ON emergency_calls 
FOR UPDATE 
USING (true);

-- Update incident_markers policies for public access
DROP POLICY IF EXISTS "Incident markers are viewable by everyone" ON incident_markers;
DROP POLICY IF EXISTS "Responders can update incident markers" ON incident_markers;
DROP POLICY IF EXISTS "System can create incident markers" ON incident_markers;

CREATE POLICY "Public can view incident markers" 
ON incident_markers 
FOR SELECT 
USING (true);

CREATE POLICY "Public can create incident markers" 
ON incident_markers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update incident markers" 
ON incident_markers 
FOR UPDATE 
USING (true);