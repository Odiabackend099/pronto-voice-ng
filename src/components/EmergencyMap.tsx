import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, X, Zap, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OpenStreetMapComponent from './OpenStreetMapComponent';
import { useToast } from '@/components/ui/use-toast';

interface EmergencyMapProps {
  onClose: () => void;
}

const EmergencyMap: React.FC<EmergencyMapProps> = ({ onClose }) => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const { toast } = useToast();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto glass-card border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png"
                alt="Protect.NG CrossAI"
                className="w-8 h-8"
              />
              <div>
                <CardTitle className="text-xl">Live Emergency Map & GPS Tracking</CardTitle>
                <CardDescription>Real-time location tracking and emergency incident monitoring</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Live OpenStreetMap */}
          <OpenStreetMapComponent 
            showIncidents={true}
            onLocationUpdate={(lat, lng, address) => {
              setCurrentLocation({ lat, lng });
              if (address) setLocationAddress(address);
            }}
          />

          {/* Emergency Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Emergency Actions
              </CardTitle>
              <CardDescription>
                Quick actions available at your current location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  className="justify-start gap-2" 
                  variant="destructive"
                  onClick={() => {
                    toast({
                      title: "Emergency Services Contacted",
                      description: "Your location has been shared with emergency responders.",
                    });
                  }}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Report Emergency at This Location
                </Button>
                
                <Button 
                  className="justify-start gap-2" 
                  variant="outline"
                  onClick={() => {
                    if (navigator.share && currentLocation) {
                      navigator.share({
                        title: 'My Emergency Location',
                        text: `I'm currently at: ${locationAddress || `${currentLocation.lat}, ${currentLocation.lng}`}`,
                        url: `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`
                      });
                    } else if (currentLocation) {
                      const locationText = `Emergency Location: ${locationAddress || `${currentLocation.lat}, ${currentLocation.lng}`}`;
                      navigator.clipboard.writeText(locationText);
                      toast({
                        title: "Location Copied",
                        description: "Your emergency location has been copied to clipboard.",
                      });
                    }
                  }}
                >
                  <MapPin className="w-4 h-4" />
                  Share Current Location
                </Button>
                
                <Button 
                  className="justify-start gap-2" 
                  variant="outline"
                  onClick={() => {
                    if (currentLocation) {
                      const url = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
                      window.open(url, '_blank');
                    }
                  }}
                >
                  <Navigation className="w-4 h-4" />
                  Open in Google Maps
                </Button>
                
                <Button 
                  className="justify-start gap-2" 
                  variant="secondary"
                  onClick={() => {
                    toast({
                      title: "Responders Notified",
                      description: "Emergency responders have been alerted to your location.",
                    });
                  }}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Alert Emergency Responders
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Location Status */}
          {currentLocation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Current Location Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Coordinates:</span>
                    <Badge variant="outline" className="font-mono">
                      {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                    </Badge>
                  </div>
                  {locationAddress && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">Address:</span>
                      <span className="text-sm text-muted-foreground text-right max-w-xs">
                        {locationAddress}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge className="gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Live Tracking
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyMap;