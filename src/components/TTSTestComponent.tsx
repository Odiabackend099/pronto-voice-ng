import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Play, Square, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTTS } from "@/hooks/useTTS";
import { NIGERIAN_VOICES, type NigerianVoice } from "@/utils/ttsClient";
import { logger } from "@/utils/logger";

interface TTSTestComponentProps {
  className?: string;
}

const TTSTestComponent = ({ className = "" }: TTSTestComponentProps) => {
  const [testText, setTestText] = useState("Emergency services are on the way. Please stay calm and provide your location.");
  const [selectedVoice, setSelectedVoice] = useState<NigerianVoice>("en-NG-EzinneNeural");
  const [lastResponse, setLastResponse] = useState<any>(null);
  const { toast } = useToast();
  const { play, stop, isLoading, isPlaying } = useTTS();

  const testTTS = async () => {
    if (!testText.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to test TTS",
        variant: "destructive"
      });
      return;
    }

    try {
      logger.debug('Testing ODIA TTS functionality', { 
        textLength: testText.length, 
        voice: selectedVoice 
      }, "TTSTestComponent");
      
      await play(testText, selectedVoice);
      
      setLastResponse({
        provider: "ODIA TTS",
        voice: selectedVoice,
        text_length: testText.length,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "TTS Success",
        description: `Audio generated using ODIA TTS with ${NIGERIAN_VOICES[selectedVoice]}`,
      });
      
    } catch (error: any) {
      logger.error('ODIA TTS test failed', { 
        error: error.message, 
        voice: selectedVoice 
      }, "TTSTestComponent");
      
      toast({
        title: "TTS Test Failed",
        description: error.message || "Failed to generate audio. Check ODIA TTS service.",
        variant: "destructive"
      });
    }
  };

  const stopAudio = () => {
    stop();
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

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Voice:
            </label>
            <Select value={selectedVoice} onValueChange={(value: NigerianVoice) => setSelectedVoice(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(NIGERIAN_VOICES).map(([voice, description]) => (
                  <SelectItem key={voice} value={voice}>
                    {description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <p>Provider: <span className="text-foreground">{lastResponse.provider}</span></p>
                <p>Voice: <span className="text-foreground">{lastResponse.voice}</span></p>
                <p>Text Length: <span className="text-foreground">{lastResponse.text_length} characters</span></p>
                <p>Timestamp: <span className="text-foreground">{new Date(lastResponse.timestamp).toLocaleTimeString()}</span></p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">ODIA TTS Requirements:</p>
              <ul className="list-disc list-inside text-blue-700 mt-1 space-y-1">
                <li>ODIA TTS service running at https://odia-tts.onrender.com</li>
                <li>Support for Nigerian English, Yoruba, Igbo, and Hausa voices</li>
                <li>Browser must allow audio playback (user gesture required)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TTSTestComponent;