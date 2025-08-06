import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Phone, AlertTriangle, Clock } from "lucide-react";
import VoiceRecorder from "@/components/VoiceRecorder";
import ConversationAgent from "@/components/ConversationAgent";
import NigeriaMap from "@/components/NigeriaMap";
import TTSTestComponent from "@/components/TTSTestComponent";
import { useToast } from "@/hooks/use-toast";

const EmergencyReport = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>();
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTranscript = (text: string, language: string) => {
    setTranscript(text);
    setDetectedLanguage(language);
    
    // Simulate emergency classification and logging
    setTimeout(() => {
      const newEmergencyId = `EMG-${Date.now()}`;
      setEmergencyId(newEmergencyId);
      
      toast({
        title: "Emergency Logged Successfully",
        description: `Emergency ID: ${newEmergencyId} - Response team has been notified.`,
      });
    }, 2000);
  };

  const handleAIEmergencyDetected = (emergency: any) => {
    setTranscript(emergency.transcript || emergency.description || "AI detected emergency");
    setDetectedLanguage(emergency.detectedLanguage || "en");
    
    // Log AI-detected emergency
    setTimeout(() => {
      const newEmergencyId = `AI-EMG-${Date.now()}`;
      setEmergencyId(newEmergencyId);
      
      toast({
        title: "AI Emergency Detected",
        description: `Emergency ID: ${newEmergencyId} - AI assistant logged emergency details.`,
      });
    }, 1000);
  };

  const handleLocationUpdate = (location: [number, number]) => {
    setUserLocation(location);
  };

  const handleRecordingState = (recording: boolean) => {
    setIsRecording(recording);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
              
              <div className="flex items-center gap-3">
                <img 
                  src="/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png"
                  alt="Protect.NG CrossAI"
                  className="w-8 h-8"
                />
                <div>
                  <h1 className="text-xl font-bold text-foreground">Emergency Response</h1>
                  <p className="text-sm text-muted-foreground">Protect.NG CrossAI</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant={isRecording ? "destructive" : "secondary"} className="gap-2">
                <div className={`status-indicator ${isRecording ? 'bg-emergency-critical' : 'bg-muted-foreground'}`} />
                {isRecording ? "Recording Emergency" : "Standby"}
              </Badge>

              <Button variant="outline" size="sm" className="gap-2 text-emergency-critical border-emergency-critical">
                <Phone className="w-4 h-4" />
                Emergency Hotline: 199
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Emergency Alert Banner */}
        <Card className="p-6 mb-8 bg-emergency-critical/10 border-emergency-critical/30">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-emergency-critical flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Emergency Response System Active
              </h2>
              <p className="text-muted-foreground">
                This system is connected to Nigerian Federal Emergency Management Agency (NEMA) 
                and local emergency responders. Your location and emergency details will be 
                immediately forwarded to the nearest response team.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voice Recording Panel */}
          <div className="space-y-6">
            <VoiceRecorder 
              onTranscript={handleTranscript}
              onRecordingState={handleRecordingState}
            />

            {/* AI Conversation Agent */}
            <ConversationAgent 
              agentId="agent_9301k1v115cyfh7ba0eb9bhh3qzw"
              onEmergencyDetected={handleAIEmergencyDetected}
            />

            {/* TTS Test Component */}
            <TTSTestComponent />

            {/* Emergency Instructions */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                How to Report an Emergency
              </h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  <p>Click "Start Emergency Call" and speak clearly into your microphone.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                  <p>Describe the emergency in any Nigerian language (English, Pidgin, Hausa, Yoruba, Igbo).</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  <p>Provide your location details and any immediate dangers.</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                  <p>Stay on the line for immediate response coordination.</p>
                </div>
              </div>
            </Card>

            {/* Emergency Details */}
            {emergencyId && (
              <Card className="p-6 bg-nigeria-green/10 border-nigeria-green/30">
                <h3 className="font-semibold text-foreground mb-4">Emergency Logged</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emergency ID:</span>
                    <span className="font-mono text-foreground">{emergencyId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="default" className="bg-nigeria-green">
                      Response Team Notified
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span className="text-foreground">{new Date().toLocaleTimeString()}</span>
                  </div>
                  {userLocation && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="text-foreground font-mono text-xs">
                        {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Map Panel */}
          <div>
            <NigeriaMap 
              userLocation={userLocation}
              onLocationUpdate={handleLocationUpdate}
            />
          </div>
        </div>

        {/* Emergency Contacts */}
        <Card className="mt-8 p-6 bg-card/50 border-primary/20">
          <h3 className="font-semibold text-foreground mb-4">Emergency Contacts</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-emergency-critical/10">
              <h4 className="font-semibold text-foreground">Police</h4>
              <p className="text-2xl font-bold text-emergency-critical">199</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emergency-high/10">
              <h4 className="font-semibold text-foreground">Fire Service</h4>
              <p className="text-2xl font-bold text-emergency-high">199</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emergency-medium/10">
              <h4 className="font-semibold text-foreground">Medical Emergency</h4>
              <p className="text-2xl font-bold text-emergency-medium">199</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default EmergencyReport;