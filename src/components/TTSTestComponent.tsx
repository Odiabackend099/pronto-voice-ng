import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Volume2, Play, Square, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TTSTestComponentProps {
  className?: string;
}

const TTSTestComponent = ({ className = "" }: TTSTestComponentProps) => {
  const [testText, setTestText] = useState("Emergency services are on the way. Please stay calm and provide your location.");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const { toast } = useToast();

  const testTTS = async () => {
    if (!testText.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to test TTS",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Testing TTS with text:', testText);
      
      // Call the TTS edge function
      const { data, error } = await supabase.functions.invoke('tts-generate', {
        body: { 
          text: testText,
          voice_id: "djTpf4uIoIkiTgl4S93N" // Default ElevenLabs voice
        }
      });

      if (error) {
        throw error;
      }

      setLastResponse(data);
      
      if (data.audio_url) {
        setIsPlaying(true);
        const audio = new Audio(data.audio_url);
        
        audio.onended = () => {
          setIsPlaying(false);
        };
        
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsPlaying(false);
          toast({
            title: "Playback Error",
            description: "Audio generated but playback failed. Check browser audio settings.",
            variant: "destructive"
          });
        };

        await audio.play();
        
        toast({
          title: "TTS Success",
          description: `Audio generated using ${data.provider || 'unknown'} provider`,
        });
      } else {
        throw new Error('No audio URL in response');
      }
      
    } catch (error: any) {
      console.error('TTS test failed:', error);
      setIsPlaying(false);
      toast({
        title: "TTS Test Failed",
        description: error.message || "Failed to generate audio. Check API configuration.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    // Stop any currently playing audio
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsPlaying(false);
  };

  return (
    <Card className={`p-6 bg-card/80 backdrop-blur-sm border-primary/20 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Volume2 className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">TTS Functionality Test</h3>
            <p className="text-sm text-muted-foreground">
              Test the Text-to-Speech voice agent functionality
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Test Text:
            </label>
            <Input
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            {!isPlaying ? (
              <Button 
                onClick={testTTS}
                disabled={isLoading}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                {isLoading ? "Generating..." : "Test TTS"}
              </Button>
            ) : (
              <Button 
                onClick={stopAudio}
                variant="destructive"
                className="gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Audio
              </Button>
            )}
          </div>

          {isPlaying && (
            <Badge variant="default" className="gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Playing Audio...
            </Badge>
          )}

          {lastResponse && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">Last Response:</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Provider: <span className="text-foreground">{lastResponse.provider || 'N/A'}</span></p>
                <p>Duration: <span className="text-foreground">{lastResponse.duration_ms ? `${lastResponse.duration_ms}ms` : 'N/A'}</span></p>
                <p>Audio URL: <span className="text-foreground">{lastResponse.audio_url ? 'Generated' : 'Not available'}</span></p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">TTS Test Requirements:</p>
              <ul className="list-disc list-inside text-yellow-700 mt-1 space-y-1">
                <li>ElevenLabs API key must be configured in Supabase secrets</li>
                <li>Fallback to OpenAI TTS if ElevenLabs fails</li>
                <li>Browser must allow audio playback</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TTSTestComponent;