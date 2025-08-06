import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Locate, Navigation, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmergencyMapProps {
  onClose: () => void;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

const EmergencyMap = ({ onClose }: EmergencyMapProps) => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setIsLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        try {
          // Reverse geocoding to get address
          const address = await reverseGeocode(latitude, longitude);
          
          setUserLocation({
            latitude,
            longitude,
            accuracy,
            address
          });
          
          toast({
            title: "Location Found",
            description: `Current location: ${address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}`,
          });
        } catch (error) {
          setUserLocation({
            latitude,
            longitude,
            accuracy
          });
          
          toast({
            title: "Location Found",
            description: `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          });
        }
        
        setIsLoading(false);
      },
      (error) => {
        let errorMessage = "Failed to get location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        
        setLocationError(errorMessage);
        setIsLoading(false);
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // This is a basic reverse geocoding implementation
    // In production, you should use a proper geocoding service like Google Maps or Mapbox
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    
    if (!response.ok) {
      throw new Error("Geocoding failed");
    }
    
    const data = await response.json();
    return data.display_name || data.locality || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const shareLocation = () => {
    if (!userLocation) return;
    
    const locationText = `Emergency Location: ${userLocation.address || `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`}\nAccuracy: ${userLocation.accuracy.toFixed(0)} meters`;
    
    navigator.share?.({
      title: "Emergency Location",
      text: locationText,
    }).catch(() => {
      // Fallback to clipboard
      navigator.clipboard.writeText(locationText);
      toast({
        title: "Location Copied",
        description: "Emergency location copied to clipboard",
      });
    });
  };

  const openInMaps = () => {
    if (!userLocation) return;
    
    const { latitude, longitude } = userLocation;
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl glass-card border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Emergency Location</CardTitle>
                <CardDescription>Your current location for emergency response</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Location Status */}
          <div className="flex items-center gap-4">
            <Badge variant={userLocation ? "default" : isLoading ? "secondary" : "destructive"}>
              {isLoading ? "Locating..." : userLocation ? "Location Found" : "Location Error"}
            </Badge>
            {userLocation && (
              <Badge variant="outline">
                Accuracy: ±{userLocation.accuracy.toFixed(0)}m
              </Badge>
            )}
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            {isLoading && (
              <div className="text-center p-8">
                <Locate className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold mb-2">Getting Your Location</h3>
                <p className="text-muted-foreground">
                  Please allow location access for emergency response coordination
                </p>
              </div>
            )}

            {locationError && (
              <div className="text-center p-8 bg-destructive/10 rounded-lg">
                <MapPin className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-destructive">Location Error</h3>
                <p className="text-muted-foreground mb-4">{locationError}</p>
                <Button onClick={getCurrentLocation} variant="outline">
                  <Locate className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {userLocation && (
              <div className="space-y-4">
                <div className="p-6 bg-muted/30 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Your Emergency Location</h3>
                  
                  <div className="space-y-3">
                    {userLocation.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <p className="text-foreground">{userLocation.address}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Latitude</label>
                        <p className="text-foreground font-mono">{userLocation.latitude.toFixed(6)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Longitude</label>
                        <p className="text-foreground font-mono">{userLocation.longitude.toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Map Placeholder - In production, integrate with Mapbox */}
                <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-primary/20">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h4 className="text-lg font-semibold mb-2">Interactive Map</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Map integration will show your exact location here
                    </p>
                    <Badge variant="secondary">Coming Soon - Mapbox Integration</Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button onClick={shareLocation} className="flex-1">
                    <Navigation className="w-4 h-4 mr-2" />
                    Share Location
                  </Button>
                  <Button onClick={openInMaps} variant="outline" className="flex-1">
                    <MapPin className="w-4 h-4 mr-2" />
                    Open in Maps
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyMap;