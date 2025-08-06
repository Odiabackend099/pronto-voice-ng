import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/utils/logger';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface EmergencyIncident {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'responding' | 'resolved';
  created_at: string;
}

interface OpenMapProps {
  className?: string;
  showIncidents?: boolean;
  onLocationUpdate?: (lat: number, lng: number, address?: string) => void;
}

// Component to update map center
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
};

// Create custom icons for different severity levels
const createSeverityIcon = (severity: string) => {
  const colors = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626'
  };
  
  const color = colors[severity as keyof typeof colors] || '#6B7280';
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Current location icon
const currentLocationIcon = L.divIcon({
  html: `<div style="background-color: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>`,
  className: 'current-location-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const OpenStreetMapComponent: React.FC<OpenMapProps> = ({ 
  className = "",
  showIncidents = true,
  onLocationUpdate 
}) => {
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([9.0571, 7.4514]); // Nigeria default
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [mapZoom, setMapZoom] = useState(10);
  const { toast } = useToast();

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Error",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive"
      });
      return;
    }

    setIsTracking(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation: [number, number] = [latitude, longitude];
        
        setUserLocation(newLocation);
        setCurrentLocation(newLocation);
        setMapZoom(15);
        
        logger.info('Location updated', { coordinates: { lat: latitude, lng: longitude } }, 'OpenStreetMap');
        
        // Get address using reverse geocoding (free service)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          if (data.display_name) {
            setLocationAddress(data.display_name);
            onLocationUpdate?.(latitude, longitude, data.display_name);
          }
        } catch (error) {
          logger.error('Reverse geocoding failed', { error }, 'OpenStreetMap');
        }

        setIsTracking(false);
        toast({
          title: "Location Updated",
          description: "Your current location has been successfully updated.",
        });
      },
      (error) => {
        setIsTracking(false);
        logger.error('Geolocation error', { error }, 'OpenStreetMap');
        toast({
          title: "Location Error",
          description: "Unable to retrieve your location. Please check permissions.",
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [onLocationUpdate, toast]);

  // Load emergency incidents
  const loadIncidents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('incident_markers')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedIncidents: EmergencyIncident[] = data.map(incident => ({
        id: incident.id,
        title: incident.title,
        description: incident.description || '',
        lat: incident.lat,
        lng: incident.lng,
        category: incident.category,
        severity: incident.severity as 'low' | 'medium' | 'high' | 'critical',
        status: incident.status as 'active' | 'responding' | 'resolved',
        created_at: incident.created_at
      }));

      setIncidents(formattedIncidents);
    } catch (error) {
      logger.error('Failed to load incidents', { error }, 'OpenStreetMap');
    }
  }, []);

  // Set up real-time incident updates
  useEffect(() => {
    if (!showIncidents) return;

    loadIncidents();

    const channel = supabase
      .channel('incident-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_markers'
        },
        () => {
          loadIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showIncidents, loadIncidents]);

  // Get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800';
      case 'responding': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Location Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Navigation className="w-5 h-5" />
            GPS Location Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {userLocation 
                    ? `${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`
                    : 'Getting location...'
                  }
                </p>
                {locationAddress && (
                  <p className="text-xs text-muted-foreground">{locationAddress}</p>
                )}
              </div>
            </div>
            <Button
              onClick={getCurrentLocation}
              disabled={isTracking}
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isTracking ? 'animate-spin' : ''}`} />
              Update Location
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card>
        <CardContent className="p-0">
          <div className="w-full h-96 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
            <MapContainer
              center={currentLocation}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <MapUpdater center={currentLocation} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Current location marker */}
              {userLocation && (
                <Marker position={userLocation} icon={currentLocationIcon}>
                  <Popup>
                    <div className="text-center">
                      <strong>Your Current Location</strong>
                      <br />
                      {locationAddress && <small>{locationAddress}</small>}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Emergency incident markers */}
              {showIncidents && incidents.map((incident) => (
                <Marker
                  key={incident.id}
                  position={[incident.lat, incident.lng]}
                  icon={createSeverityIcon(incident.severity)}
                >
                  <Popup>
                    <div className="max-w-xs">
                      <h3 className="font-bold text-sm mb-1">{incident.title}</h3>
                      <p className="text-xs text-gray-600 mb-2">{incident.description}</p>
                      <div className="flex justify-between items-center">
                        <Badge variant="secondary" className={getSeverityColor(incident.severity)}>
                          {incident.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(incident.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Emergency Incidents */}
      {showIncidents && incidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent Emergency Incidents ({incidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{incident.title}</h4>
                      <Badge variant="secondary" className={getSeverityColor(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{incident.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(incident.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(incident.status)}>
                    {incident.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OpenStreetMapComponent;