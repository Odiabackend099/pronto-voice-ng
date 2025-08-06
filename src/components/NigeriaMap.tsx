import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Layers, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmergencyIncident {
  id: string;
  type: 'fire' | 'accident' | 'medical' | 'security' | 'flood';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: [number, number]; // [longitude, latitude]
  description: string;
  timestamp: Date;
  status: 'active' | 'responding' | 'resolved';
}

interface NigeriaMapProps {
  userLocation?: [number, number];
  onLocationUpdate: (location: [number, number]) => void;
}

const NigeriaMap = ({ userLocation, onLocationUpdate }: NigeriaMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(userLocation || null);
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<EmergencyIncident | null>(null);
  const { toast } = useToast();

  // Mock incidents for demonstration
  const mockIncidents: EmergencyIncident[] = [
    {
      id: '1',
      type: 'fire',
      severity: 'critical',
      location: [3.3792, 6.5244], // Lagos
      description: 'Major fire at Yaba Market',
      timestamp: new Date(),
      status: 'active'
    },
    {
      id: '2', 
      type: 'accident',
      severity: 'high',
      location: [3.3841, 6.4474], // Third Mainland Bridge
      description: 'Multi-vehicle accident on Third Mainland Bridge',
      timestamp: new Date(Date.now() - 300000),
      status: 'responding'
    },
    {
      id: '3',
      type: 'medical',
      severity: 'medium',
      location: [7.4951, 9.0765], // Abuja
      description: 'Medical emergency at National Hospital',
      timestamp: new Date(Date.now() - 600000),
      status: 'responding'
    }
  ];

  useEffect(() => {
    setIncidents(mockIncidents);
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [
            position.coords.longitude,
            position.coords.latitude
          ];
          setCurrentLocation(location);
          onLocationUpdate(location);
          
          toast({
            title: "Location Acquired",
            description: "Your GPS location has been detected for emergency response.",
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Default to Lagos coordinates if geolocation fails
          const defaultLocation: [number, number] = [3.3792, 6.5244];
          setCurrentLocation(defaultLocation);
          onLocationUpdate(defaultLocation);
          
          toast({
            title: "Location Access Denied",
            description: "Using default location. Please enable GPS for accurate emergency response.",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  };

  const getIncidentColor = (type: string, severity: string) => {
    const severityColors = {
      critical: '#DC2626', // red-600
      high: '#EA580C',     // orange-600  
      medium: '#D97706',   // amber-600
      low: '#16A34A'       // green-600
    };
    return severityColors[severity as keyof typeof severityColors] || '#6B7280';
  };

  const getIncidentIcon = (type: string) => {
    const icons = {
      fire: '🔥',
      accident: '🚗',
      medical: '🏥',
      security: '👮',
      flood: '🌊'
    };
    return icons[type as keyof typeof icons] || '📍';
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Fallback map component since we can't use actual Mapbox without API key
  const MapFallback = () => (
    <div className="relative w-full h-96 bg-nigeria-dark rounded-lg overflow-hidden">
      {/* Nigeria Map SVG Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-nigeria-green/20 to-nigeria-dark opacity-80" />
      
      {/* Map Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="grid grid-cols-12 grid-rows-8 h-full w-full">
          {Array.from({ length: 96 }).map((_, i) => (
            <div key={i} className="border border-foreground/10" />
          ))}
        </div>
      </div>

      {/* Nigeria Label */}
      <div className="absolute top-4 left-4">
        <Badge className="bg-nigeria-green text-white">
          🇳🇬 Federal Republic of Nigeria
        </Badge>
      </div>

      {/* Current Location Pin */}
      {currentLocation && (
        <div 
          className="absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 animate-bounce"
          style={{
            left: '45%', // Approximate Lagos position
            top: '70%'
          }}
        >
          <div className="w-6 h-6 bg-primary rounded-full border-4 border-white shadow-lg">
            <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75" />
          </div>
        </div>
      )}

      {/* Incident Markers */}
      {incidents.map((incident, index) => (
        <div
          key={incident.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{
            left: `${30 + index * 15}%`, // Distribute across map
            top: `${50 + index * 10}%`
          }}
          onClick={() => setSelectedIncident(incident)}
        >
          <div 
            className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm emergency-pulse"
            style={{ backgroundColor: getIncidentColor(incident.type, incident.severity) }}
          >
            {getIncidentIcon(incident.type)}
          </div>
        </div>
      ))}

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button 
          size="sm" 
          variant="secondary"
          onClick={getCurrentLocation}
          className="bg-white/90 text-foreground hover:bg-white"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="secondary"
          className="bg-white/90 text-foreground hover:bg-white"
        >
          <Layers className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Emergency Response Map
          </h3>
          <Badge variant="outline" className="gap-2">
            <div className="status-indicator bg-primary" />
            {incidents.filter(i => i.status === 'active').length} Active Incidents
          </Badge>
        </div>

        <MapFallback />

        {/* Location Status */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {currentLocation ? (
              <span className="flex items-center gap-2">
                <div className="status-indicator bg-primary" />
                GPS Location: {currentLocation[1].toFixed(4)}, {currentLocation[0].toFixed(4)}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <div className="status-indicator bg-muted-foreground" />
                Acquiring GPS location...
              </span>
            )}
          </div>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={getCurrentLocation}
            className="gap-2"
          >
            <Navigation className="w-4 h-4" />
            Update Location
          </Button>
        </div>
      </Card>

      {/* Incident Details */}
      {selectedIncident && (
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: getIncidentColor(selectedIncident.type, selectedIncident.severity) }}
              >
                {getIncidentIcon(selectedIncident.type)}
              </div>
              <div>
                <h4 className="font-semibold text-foreground capitalize">
                  {selectedIncident.type} Emergency
                </h4>
                <Badge 
                  variant={selectedIncident.severity === 'critical' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {selectedIncident.severity.toUpperCase()}
                </Badge>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setSelectedIncident(null)}
            >
              ✕
            </Button>
          </div>

          <p className="text-foreground mb-3">{selectedIncident.description}</p>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Status: <span className="capitalize font-medium">{selectedIncident.status}</span></span>
            <span>{formatTimeAgo(selectedIncident.timestamp)}</span>
          </div>
        </Card>
      )}

      {/* Incident List */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          Recent Emergency Incidents
        </h4>
        
        <div className="space-y-3">
          {incidents.slice(0, 3).map((incident) => (
            <div 
              key={incident.id}
              className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors cursor-pointer"
              onClick={() => setSelectedIncident(incident)}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: getIncidentColor(incident.type, incident.severity) }}
                >
                  {getIncidentIcon(incident.type)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{incident.description}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeAgo(incident.timestamp)}</p>
                </div>
              </div>
              
              <Badge 
                variant={incident.status === 'active' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {incident.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default NigeriaMap;