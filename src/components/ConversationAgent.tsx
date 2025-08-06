import { useState, useEffect } from "react";
import { useConversation } from "@11labs/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

interface ConversationAgentProps {
  agentId?: string;
  onEmergencyDetected?: (emergency: any) => void;
  className?: string;
}

const ConversationAgent = ({ 
  agentId = "agent_9301k1v115cyfh7ba0eb9bhh3qzw", 
  onEmergencyDetected,
  className = ""
}: ConversationAgentProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [messages, setMessages] = useState<Array<{
    role: string;
    content: string;
    timestamp: Date;
  }>>([]);
  
  const { toast } = useToast();

  const conversation = useConversation({
    onConnect: () => {
      logger.info("Connected to ElevenLabs conversation", undefined, "ConversationAgent");
      setIsConnected(true);
      toast({
        title: "AI Agent Connected",
        description: "Emergency AI assistant is now listening and ready to help.",
      });
    },
    onDisconnect: () => {
      logger.info("Disconnected from ElevenLabs conversation", undefined, "ConversationAgent");
      setIsConnected(false);
      toast({
        title: "AI Agent Disconnected",
        description: "Connection to emergency AI assistant has ended.",
        variant: "destructive"
      });
    },
    onMessage: (message) => {
      logger.debug("New message received", { messageType: typeof message }, "ConversationAgent");
      setMessages(prev => [...prev, {
        role: message.source || "assistant",
        content: message.message || "",
        timestamp: new Date()
      }]);

      // Check if this is an emergency detection
      if (message.message && typeof message.message === 'string') {
        const content = message.message.toLowerCase();
        if (content.includes('emergency') || content.includes('help') || content.includes('urgent')) {
          onEmergencyDetected?.({
            transcript: message.message,
            detectedLanguage: 'en',
            timestamp: new Date(),
            source: 'ai_agent'
          });
        }
      }
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to AI agent. Please check your API configuration.",
        variant: "destructive"
      });
    },
    clientTools: {
      logEmergency: (parameters: { 
        emergencyType: string; 
        severity: string; 
        description: string; 
        location?: string;
      }) => {
        logger.emergencyReported(Date.now().toString(), parameters.emergencyType, parameters.severity);
        onEmergencyDetected?.(parameters);
        return "Emergency has been logged and response team notified.";
      },
      getLocation: () => {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
              };
              resolve(`Current location: ${location.lat}, ${location.lng} (accuracy: ${location.accuracy}m)`);
            },
            (error) => {
              resolve(`Location unavailable: ${error.message}`);
            }
          );
        });
      }
    }
  });

  const startConversation = async () => {
    try {
      // Generate signed URL using our edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
        body: { agent_id: agentId }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      const conversationId = await conversation.startSession({ 
        signedUrl: data.signed_url 
      });
      logger.info("Conversation started", { conversationId }, "ConversationAgent");
    } catch (error) {
      logger.error("Failed to start conversation", { error: error instanceof Error ? error.message : error }, "ConversationAgent");
      toast({
        title: "Connection Failed",
        description: "Could not connect to AI agent. Please check your ElevenLabs configuration.",
        variant: "destructive"
      });
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
      setMessages([]);
    } catch (error) {
      console.error("Failed to end conversation:", error);
    }
  };

  const adjustVolume = async (newVolume: number) => {
    try {
      await conversation.setVolume({ volume: newVolume });
      setVolume(newVolume);
    } catch (error) {
      console.error("Failed to adjust volume:", error);
    }
  };

  return (
    <Card className={`p-6 bg-card/80 backdrop-blur-sm border-primary/20 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">AI Emergency Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Conversational AI for emergency response
              </p>
            </div>
          </div>
          
          <Badge variant={isConnected ? "default" : "secondary"} className="gap-2">
            <div className={`status-indicator ${isConnected ? 'bg-primary' : 'bg-muted-foreground'}`} />
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {!isConnected ? (
            <Button 
              onClick={startConversation}
              className="emergency-button gap-2"
            >
              <Mic className="w-5 h-5" />
              Start AI Conversation
            </Button>
          ) : (
            <Button 
              onClick={endConversation}
              variant="destructive"
              className="gap-2"
            >
              <MicOff className="w-5 h-5" />
              End Conversation
            </Button>
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustVolume(volume > 0 ? 0 : 0.8)}
            >
              {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => adjustVolume(parseFloat(e.target.value))}
              className="w-20"
            />
          </div>
        </div>

        {/* Speaking Indicator */}
        {conversation.isSpeaking && (
          <div className="flex items-center gap-2 text-primary">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">AI is speaking...</span>
          </div>
        )}

        {/* Conversation Messages */}
        {messages.length > 0 && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            <h4 className="text-sm font-medium text-muted-foreground">Conversation Log:</h4>
            {messages.slice(-5).map((message, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg text-sm ${
                  message.role === 'user' 
                    ? 'bg-primary/10 text-foreground ml-8' 
                    : 'bg-muted/50 text-muted-foreground mr-8'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <p>{message.content}</p>
                  <span className="text-xs opacity-60 flex-shrink-0">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• This AI agent can understand multiple Nigerian languages</p>
          <p>• Speak naturally about your emergency situation</p>
          <p>• The AI will ask clarifying questions and log emergency details</p>
          <p>• Your conversation is processed in real-time for emergency response</p>
        </div>
      </div>
    </Card>
  );
};

export default ConversationAgent;