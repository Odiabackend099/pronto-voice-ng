import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Phone, PhoneOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceRecorderProps {
  onTranscript: (text: string, language: string) => void;
  onRecordingState: (recording: boolean) => void;
}

const VoiceRecorder = ({ onTranscript, onRecordingState }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string>("");
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const supportedLanguages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "ha", name: "Hausa", flag: "🇳🇬" },
    { code: "yo", name: "Yoruba", flag: "🇳🇬" },
    { code: "ig", name: "Igbo", flag: "🇳🇬" },
    { code: "pcm", name: "Pidgin", flag: "🇳🇬" }
  ];

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const setupAudioVisualization = (stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setAudioLevel(average);
        }
      };

      intervalRef.current = setInterval(updateAudioLevel, 100);
    } catch (error) {
      console.error("Audio visualization setup failed:", error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      setupAudioVisualization(stream);

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        await processAudio(audioBlob);
        chunks.length = 0;
      };

      mediaRecorderRef.current.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      setIsConnected(true);
      setRecordingTime(0);
      onRecordingState(true);

      // Start recording timer
      timeIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Emergency Recording Started",
        description: "Speak clearly. The system is listening in multiple Nigerian languages.",
      });

    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Microphone Access Required", 
        description: "Please allow microphone access for emergency reporting.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsRecording(false);
    setIsConnected(false);
    setAudioLevel(0);
    setRecordingTime(0);
    onRecordingState(false);
  };

  const processAudio = async (audioBlob: Blob) => {
    let classification: any = null;
    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Call STT edge function
      const { data: sttResult, error: sttError } = await supabase.functions.invoke('stt-transcribe', {
        body: { audio: base64Audio }
      });

      if (sttError) {
        throw new Error('STT processing failed: ' + sttError.message);
      }

      const { transcript, detected_language, confidence } = sttResult;
      setCurrentTranscript(transcript);
      setDetectedLanguage(detected_language);
      onTranscript(transcript, detected_language);

      // Classify the emergency
      const { data: classifyResult, error: classifyError } = await supabase.functions.invoke('classify-emergency', {
        body: { 
          transcript, 
          language: detected_language 
        }
      });

      if (classifyError) {
        console.error('Classification failed:', classifyError);
        // Continue with default classification
        await playAudioResponse("Emergency received. Help is on the way.");
        classification = { emergency_type: 'general', severity: 'medium' };
      } else {
        classification = classifyResult;
        // Generate TTS response using ODIA TTS directly
        const ttsText = classification.response || "Emergency received. Help is on the way.";
        await playAudioResponse(ttsText);
      }

      // Log the emergency
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { data: logResult, error: logError } = await supabase.functions.invoke('log-emergency', {
          body: {
            transcript,
            detected_language,
            confidence,
            emergency_type: classification?.emergency_type || 'general',
            severity: classification?.severity || 'medium',
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude,
            audio_url: null,
          }
        });

        if (logError) {
          console.error('Failed to log emergency:', logError);
        } else {
          console.log('Emergency logged successfully:', logResult);
        }
      }, (error) => {
        console.error('Geolocation error:', error);
        // Log without location
        supabase.functions.invoke('log-emergency', {
          body: {
            transcript,
            detected_language,
            confidence,
            emergency_type: classification?.emergency_type || 'general',
            severity: classification?.severity || 'medium',
            location_lat: null,
            location_lng: null,
            audio_url: null,
          }
        });
      });

    } catch (error) {
      console.error("Audio processing failed:", error);
      toast({
        title: "Processing Error",
        description: "Failed to process audio. Please try again.",
        variant: "destructive"
      });
    }
  };

  const playAudioResponse = async (ttsText: string) => {
    try {
      // Use ODIA TTS for emergency response
      const params = new URLSearchParams({
        text: ttsText,
        voice: 'en-NG-EzinneNeural', // Nigerian English female voice
        rate: '+0%',
        volume: '+0%'
      });

      const response = await fetch(`https://odia-tts.onrender.com/speak?${params.toString()}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl); // Cleanup
        console.log('ODIA TTS audio playback finished');
      };
      
      audio.onerror = (e) => {
        console.error('ODIA TTS audio playback error:', e);
        URL.revokeObjectURL(audioUrl); // Cleanup
        
        // Fallback to browser speech synthesis
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(ttsText);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
          
          // Try to use a more natural voice if available
          const voices = speechSynthesis.getVoices();
          const preferredVoice = voices.find(voice => 
            voice.lang.includes('en') && voice.name.includes('Female')
          ) || voices.find(voice => voice.lang.includes('en'));
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
          
          speechSynthesis.speak(utterance);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Failed to play ODIA TTS response:', error);
      
      // Fallback to browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(ttsText);
        speechSynthesis.speak(utterance);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLanguageInfo = (code: string) => {
    return supportedLanguages.find(lang => lang.code === code) || supportedLanguages[0];
  };

  return (
    <Card className="p-8 bg-card/80 backdrop-blur-sm border-primary/20">
      <div className="text-center space-y-6">
        {/* Status Indicators */}
        <div className="flex justify-center gap-4 mb-6">
          <Badge variant={isConnected ? "default" : "secondary"} className="gap-2">
            <div className={`status-indicator ${isConnected ? 'bg-primary' : 'bg-muted-foreground'}`} />
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          
          {detectedLanguage && (
            <Badge variant="outline" className="gap-2">
              {getLanguageInfo(detectedLanguage).flag}
              {getLanguageInfo(detectedLanguage).name}
            </Badge>
          )}
        </div>

        {/* Microphone Visualization */}
        <div className="relative">
          <div className={`
            w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-300
            ${isRecording 
              ? 'bg-emergency-critical/20 border-4 border-emergency-critical mic-listening' 
              : 'bg-primary/20 border-4 border-primary/40'
            }
          `}>
            {isRecording ? (
              <MicOff className="w-12 h-12 text-emergency-critical" />
            ) : (
              <Mic className="w-12 h-12 text-primary" />
            )}
          </div>
          
          {/* Audio Level Visualization */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="absolute rounded-full border-2 border-emergency-critical/50 animate-ping"
                style={{
                  width: `${Math.max(128, 128 + audioLevel)}px`,
                  height: `${Math.max(128, 128 + audioLevel)}px`,
                }}
              />
            </div>
          )}
        </div>

        {/* Recording Timer */}
        {isRecording && (
          <div className="text-2xl font-mono text-emergency-critical font-bold">
            {formatTime(recordingTime)}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          {!isRecording ? (
            <Button 
              onClick={startRecording}
              className="emergency-button text-xl h-16 px-12"
              size="lg"
            >
              <Phone className="w-6 h-6 mr-3" />
              Start Emergency Call
            </Button>
          ) : (
            <Button 
              onClick={stopRecording}
              variant="destructive"
              className="text-xl h-16 px-12"
              size="lg"
            >
              <PhoneOff className="w-6 h-6 mr-3" />
              End Call
            </Button>
          )}
        </div>

        {/* Live Transcript */}
        {currentTranscript && (
          <Card className="p-6 bg-primary/10 border-primary/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
              <div className="text-left">
                <h4 className="font-semibold text-foreground mb-2">Emergency Detected:</h4>
                <p className="text-foreground text-lg">{currentTranscript}</p>
                {detectedLanguage && (
                  <p className="text-muted-foreground text-sm mt-2">
                    Detected language: {getLanguageInfo(detectedLanguage).name}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Supported Languages */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-3">Supported Languages:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {supportedLanguages.map((lang) => (
              <Badge 
                key={lang.code} 
                variant="outline" 
                className="text-xs gap-1"
              >
                {lang.flag} {lang.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VoiceRecorder;