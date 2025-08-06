import { supabase } from '@/integrations/supabase/client';
import { Emergency } from '@/stores/emergencyStore';

export interface EmergencyReportData {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: [number, number];
  transcript?: string;
  detectedLanguage?: string;
  audioData?: string;
}

export interface IncidentMarker {
  id: string;
  location: [number, number];
  type: string;
  severity: string;
  description: string;
  timestamp: Date;
  status: string;
}

class EmergencyService {
  async reportEmergency(data: EmergencyReportData): Promise<Emergency> {
    try {
      const emergencyData = {
        emergency_type: data.type,
        severity: data.severity,
        transcript: data.description, // Using transcript field for description
        detected_language: data.detectedLanguage,
        audio_url: data.audioData,
        status: 'pending',
        location_lat: data.location[0],
        location_lng: data.location[1],
        location_address: null
      };

      const { data: emergency, error } = await supabase
        .from('emergency_calls')
        .insert(emergencyData)
        .select()
        .single();

      if (error) throw error;

      // Create incident marker
      await this.createIncidentMarker({
        emergency_call_id: emergency.id,
        lat: data.location[0],
        lng: data.location[1],
        category: data.type,
        severity: data.severity,
        title: `${data.type} Emergency`,
        description: data.description
      });

      return this.transformEmergencyData(emergency);
    } catch (error) {
      console.error('Error reporting emergency:', error);
      throw new Error('Failed to report emergency');
    }
  }

  async getActiveIncidents(): Promise<IncidentMarker[]> {
    try {
      const { data, error } = await supabase
        .from('incident_markers')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.transformIncidentData);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return [];
    }
  }

  async updateEmergencyStatus(id: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('emergency_calls')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating emergency status:', error);
      throw error;
    }
  }

  async assignResponders(emergencyId: string, responderIds: string[]): Promise<void> {
    try {
      // For now, we'll store responders in a separate table or custom field
      // Since assigned_responders doesn't exist in the current schema
      const { error } = await supabase
        .from('emergency_calls')
        .update({ 
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', emergencyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error assigning responders:', error);
      throw error;
    }
  }

  private async createIncidentMarker(data: any): Promise<void> {
    const { error } = await supabase
      .from('incident_markers')
      .insert(data);

    if (error) {
      console.error('Error creating incident marker:', error);
    }
  }

  private transformEmergencyData(data: any): Emergency {
    return {
      id: data.id,
      type: data.emergency_type || 'unknown',
      severity: data.severity || 'medium',
      location: [data.location_lat || 0, data.location_lng || 0],
      timestamp: new Date(data.created_at),
      description: data.transcript || '',
      status: data.status || 'pending',
      assignedResponders: []
    };
  }

  private transformIncidentData(data: any): IncidentMarker {
    return {
      id: data.id,
      location: [data.lat, data.lng],
      type: data.category,
      severity: data.severity,
      description: data.description || '',
      timestamp: new Date(data.created_at),
      status: data.status || 'active'
    };
  }

}

export const emergencyService = new EmergencyService();