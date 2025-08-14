import LandingHero from "@/components/LandingHero";
import TTSTestComponent from "@/components/TTSTestComponent";
import VoiceRecorder from "@/components/VoiceRecorder";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const handleTranscript = (text: string, language: string) => {
    setTranscript(`[${language}] ${text}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHero />
      
      {/* Voice System Testing Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Test Voice System
            </h2>
            <p className="text-muted-foreground text-lg">
              Test the complete voice pipeline: Speech-to-Text, Emergency Classification, and Nigerian TTS
            </p>
          </div>

          <Tabs defaultValue="voice-recorder" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="voice-recorder">Voice Recorder</TabsTrigger>
              <TabsTrigger value="tts-test">TTS Test</TabsTrigger>
            </TabsList>
            
            <TabsContent value="voice-recorder" className="space-y-6">
              <VoiceRecorder 
                onTranscript={handleTranscript}
                onRecordingState={setIsRecording}
              />
              
              {transcript && (
                <Card className="p-6 bg-primary/5 border-primary/20">
                  <h3 className="font-semibold text-foreground mb-2">Last Transcript:</h3>
                  <p className="text-foreground">{transcript}</p>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="tts-test">
              <TTSTestComponent />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
};

export default Index;
