import { supabase } from '@/integrations/supabase/client';

// Google Maps Edge Function for secure API key management
export const initializeGoogleMaps = async () => {
  try {
    // Get Google Maps API key from Supabase edge function
    const { data, error } = await supabase.functions.invoke('get-google-maps-key');
    
    if (error) {
      throw new Error('Failed to get Google Maps API key');
    }
    
    return data.apiKey;
  } catch (error) {
    console.error('Google Maps initialization error:', error);
    throw error;
  }
};

// Location tracking utilities
export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
};

export const watchPosition = (
  successCallback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationPositionError) => void
): number => {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported');
  }

  return navigator.geolocation.watchPosition(
    successCallback,
    errorCallback,
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 30000
    }
  );
};

// Utility functions for emergency incidents
export const createIncidentMarker = (incident: any, map: any) => {
  const severityColors = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626'
  };

  const color = severityColors[incident.severity as keyof typeof severityColors] || '#6B7280';

  return {
    position: { lat: incident.lat, lng: incident.lng },
    title: incident.title,
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="${color}" stroke="#fff" stroke-width="2"/>
          <path d="M16 8v8l4 4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `)}`,
      scaledSize: { width: 32, height: 32 },
      anchor: { x: 16, y: 16 }
    }
  };
};