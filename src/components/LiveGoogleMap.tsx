import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, RefreshCw, AlertTriangle, Users, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/utils/logger';

// Google Maps TypeScript declarations
declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement, opts?: MapOptions);
      setCenter(latlng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
    }
    class Marker {
      constructor(opts?: MarkerOptions);
      setPosition(latlng: LatLng | LatLngLiteral): void;
      setMap(map: Map | null): void;
      addListener(eventName: string, handler: Function): void;
    }
    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map?: Map, anchor?: Marker): void;
    }
    class Geocoder {
      geocode(request: GeocoderRequest): Promise<GeocoderResponse>;
    }
    enum MapTypeId {
      ROADMAP = 'roadmap'
    }
    class Size {
      constructor(width: number, height: number);
    }
    class Point {
      constructor(x: number, y: number);
    }
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    interface LatLng extends LatLngLiteral {}
    interface MapOptions {
      zoom?: number;
      center?: LatLng | LatLngLiteral;
      mapTypeId?: MapTypeId | string;
      styles?: any[];
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      zoomControl?: boolean;
    }
    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: any;
    }
    interface InfoWindowOptions {
      content?: string;
    }
    interface GeocoderRequest {
      location?: LatLng | LatLngLiteral;
    }
    interface GeocoderResponse {
      results: Array<{ formatted_address: string }>;
    }
  }
}

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

interface LiveMapProps {
  className?: string;
  showIncidents?: boolean;
  onLocationUpdate?: (lat: number, lng: number, address?: string) => void;
}

const LiveGoogleMap: React.FC<LiveMapProps> = ({ 
  className = "",
  showIncidents = true,
  onLocationUpdate 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const incidentMarkersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const watchIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Load Google Maps
  useEffect(() => {
    const initializeMap = async () => {
      try {
        // Get Google Maps API key from Supabase edge function
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        
        if (error || !data?.apiKey) {
          throw new Error('Google Maps API key not available');
        }

        const loader = new Loader({
          apiKey: data.apiKey,
          version: 'weekly',
          libraries: ['geometry', 'geocoding']
        });

        await loader.load();
        setIsLoaded(true);
        logger.info('Google Maps loaded successfully', undefined, 'LiveGoogleMap');
      } catch (error) {
        logger.error('Failed to load Google Maps', { error }, 'LiveGoogleMap');
        toast({
          title: "Map Loading Error",
          description: "Please ensure Google Maps API key is configured correctly.",
          variant: "destructive"
        });
      }
    };

    initializeMap();
  }, [toast]);

  // Initialize map when loaded
  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstanceRef.current) {
      // Default to Nigeria coordinates
      const defaultLocation = { lat: 9.0571, lng: 7.4514 };
      
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 10,
        center: currentLocation || defaultLocation,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      logger.info('Google Map initialized', { defaultLocation }, 'LiveGoogleMap');
    }
  }, [isLoaded, currentLocation]);

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
        const newLocation = { lat: latitude, lng: longitude };
        
        setCurrentLocation(newLocation);
        logger.info('Location updated', { coordinates: newLocation }, 'LiveGoogleMap');
        
        // Update map center
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(newLocation);
          mapInstanceRef.current.setZoom(15);
          
          // Update current location marker
          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setPosition(newLocation);
          } else {
            currentLocationMarkerRef.current = new google.maps.Marker({
              position: newLocation,
              map: mapInstanceRef.current,
              title: 'Your Current Location',
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#fff" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" fill="#fff"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12)
              }
            });
          }
        }

        // Reverse geocoding to get address
        try {
          const geocoder = new google.maps.Geocoder();
          const response = await geocoder.geocode({ location: newLocation });
          if (response.results[0]) {
            const address = response.results[0].formatted_address;
            setLocationAddress(address);
            onLocationUpdate?.(latitude, longitude, address);
          }
        } catch (error) {
          logger.error('Geocoding failed', { error }, 'LiveGoogleMap');
        }

        setIsTracking(false);
        toast({
          title: "Location Updated",
          description: "Your current location has been successfully updated.",
        });
      },
      (error) => {
        setIsTracking(false);
        logger.error('Geolocation error', { error }, 'LiveGoogleMap');
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

  // Start continuous location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setCurrentLocation(newLocation);
        
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setPosition(newLocation);
        }
      },
      (error) => {
        logger.error('Location tracking error', { error }, 'LiveGoogleMap');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000
      }
    );
  }, []);

  // Stop location tracking
  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

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
      updateIncidentMarkers(formattedIncidents);
    } catch (error) {
      logger.error('Failed to load incidents', { error }, 'LiveGoogleMap');
    }
  }, []);

  // Update incident markers on map
  const updateIncidentMarkers = useCallback((incidents: EmergencyIncident[]) => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    incidentMarkersRef.current.forEach(marker => marker.setMap(null));
    incidentMarkersRef.current = [];

    // Add new markers
    incidents.forEach(incident => {
      const severityColor = {
        low: '#10B981',
        medium: '#F59E0B', 
        high: '#EF4444',
        critical: '#DC2626'
      }[incident.severity];

      const marker = new google.maps.Marker({
        position: { lat: incident.lat, lng: incident.lng },
        map: mapInstanceRef.current,
        title: incident.title,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="${severityColor}" stroke="#fff" stroke-width="2"/>
              <path d="M16 8v8l4 4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3 max-w-xs">
            <h3 class="font-bold text-sm mb-1">${incident.title}</h3>
            <p class="text-xs text-gray-600 mb-2">${incident.description}</p>
            <div class="flex justify-between items-center">
              <span class="text-xs bg-${severityColor.replace('#', '')}-100 text-${severityColor.replace('#', '')}-800 px-2 py-1 rounded">
                ${incident.severity.toUpperCase()}
              </span>
              <span class="text-xs text-gray-500">
                ${new Date(incident.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      incidentMarkersRef.current.push(marker);
    });
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

  // Start location tracking on mount
  useEffect(() => {
    getCurrentLocation();
    startLocationTracking();

    return () => {
      stopLocationTracking();
    };
  }, [getCurrentLocation, startLocationTracking, stopLocationTracking]);

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
                  {currentLocation 
                    ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
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
          <div 
            ref={mapRef} 
            className="w-full h-96 rounded-lg"
            style={{ minHeight: '400px' }}
          />
          {!isLoaded && (
            <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
              <div className="text-center space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Emergency Incidents */}
      {showIncidents && incidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent Emergency Incidents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents.slice(0, 5).map((incident) => (
              <div key={incident.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{incident.title}</h4>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{incident.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(incident.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Users className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Phone className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveGoogleMap;