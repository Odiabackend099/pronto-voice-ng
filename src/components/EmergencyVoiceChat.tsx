import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Phone, PhoneOff, AlertTriangle, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VoiceRecorder from "./VoiceRecorder";
import ConversationAgent from "./ConversationAgent";

interface EmergencyVoiceChatProps {
  onClose: () => void;
}

const EmergencyVoiceChat = ({ onClose }: EmergencyVoiceChatProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();

  const handleTranscript = (text: string, language: string) => {
    setTranscript(text);
    toast({
      title: "Voice Detected",
      description: `Speaking in ${language}: ${text.slice(0, 50)}...`,
    });
  };

  const handleEmergencyCall = () => {
    setIsConnected(true);
    toast({
      title: "Emergency Call Initiated",
      description: "Connecting to emergency response AI agent...",
    });
  };

  const handleEndCall = () => {
    setIsConnected(false);
    setIsRecording(false);
    onClose();
    toast({
      title: "Call Ended",
      description: "Emergency call session terminated",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl glass-card border-primary/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Emergency Voice Call</CardTitle>
              <CardDescription>AI-powered emergency response system</CardDescription>
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant={isRecording ? "destructive" : "outline"}>
              {isRecording ? "Recording" : "Standby"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="text-center p-6 bg-muted/30 rounded-lg">
            {!isConnected ? (
              <div className="space-y-4">
                <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto" />
                <h3 className="text-lg font-semibold">Ready to Connect</h3>
                <p className="text-muted-foreground">
                  Click the button below to start an emergency voice call with our AI response system.
                  Speak clearly in English, Pidgin, Hausa, Yoruba, or Igbo.
                </p>
                <Button 
                  onClick={handleEmergencyCall}
                  className="bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Start Emergency Call
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Volume2 className="w-12 h-12 text-green-500 mx-auto animate-pulse" />
                <h3 className="text-lg font-semibold text-green-500">Emergency Call Active</h3>
                <p className="text-muted-foreground">
                  Connected to emergency response AI. Speak now to report your emergency.
                </p>
              </div>
            )}
          </div>

          {/* Voice Interface */}
          {isConnected && (
            <div className="space-y-4">
              <VoiceRecorder
                onTranscript={handleTranscript}
                onRecordingState={setIsRecording}
              />
              
              <ConversationAgent />
              
              {transcript && (
                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="font-medium mb-2">Latest Transcript:</h4>
                  <p className="text-sm text-muted-foreground">{transcript}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            {isConnected ? (
              <Button 
                onClick={handleEndCall}
                variant="destructive"
                size="lg"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Emergency Call
              </Button>
            ) : (
              <Button 
                onClick={onClose}
                variant="outline"
                size="lg"
              >
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyVoiceChat;