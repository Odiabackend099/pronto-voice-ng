import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Wifi, WifiOff, MapPin, MapPinOff, Mic, MicOff } from "lucide-react";

interface StatusBannerProps {
  isRecording: boolean;
  isConnected: boolean;
}

const StatusBanner = ({ isRecording, isConnected }: StatusBannerProps) => {
  const [hasLocation, setHasLocation] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setHasLocation(true),
        () => setHasLocation(false)
      );
    }

    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Card className="p-4 bg-card/80 backdrop-blur-sm border-primary/20">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {/* Network Status */}
          <Badge variant={isOnline ? "default" : "destructive"} className="gap-2">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>

          {/* Location Status */}
          <Badge variant={hasLocation ? "default" : "secondary"} className="gap-2">
            {hasLocation ? <MapPin className="w-3 h-3" /> : <MapPinOff className="w-3 h-3" />}
            {hasLocation ? "Location Available" : "Location Denied"}
          </Badge>

          {/* Recording Status */}
          <Badge variant={isRecording ? "default" : "secondary"} className="gap-2">
            {isRecording ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            {isRecording ? "Recording" : "Standby"}
          </Badge>

          {/* Voice Service Status */}
          <Badge variant={isConnected ? "default" : "outline"} className="gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            Voice Service
          </Badge>
        </div>

        {/* Emergency Priority Banner */}
        {!isOnline && (
          <Badge variant="destructive" className="animate-pulse">
            Offline Mode - Calls will be queued
          </Badge>
        )}
      </div>

      {/* System Status Details */}
      <div className="mt-3 text-xs text-muted-foreground">
        <p>
          Emergency services ready • Multi-language support active • 
          {hasLocation ? " GPS enabled" : " Manual location required"}
        </p>
      </div>
    </Card>
  );
};

export default StatusBanner;