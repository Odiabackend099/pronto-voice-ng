import { useMemo, useRef, useState } from "react";
import { speak, type NigerianVoice } from "@/utils/ttsClient";
import { logger } from "@/utils/logger";

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const play = useMemo(() => {
    return async (text: string, voice: NigerianVoice = "en-NG-EzinneNeural") => {
      if (!text.trim()) {
        logger.warn('Empty text provided to TTS', {}, "useTTS");
        return;
      }

      // Abort any ongoing TTS request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setIsPlaying(false);

      try {
        logger.debug('Starting TTS synthesis', { 
          textLength: text.length, 
          voice 
        }, "useTTS");

        // Fetch MP3 from ODIA TTS service
        const { objectUrl } = await speak({
          text,
          voice,
          rate: "+0%",
          volume: "+0%",
          signal: abortRef.current.signal,
        });

        // Revoke the previous blob url to avoid memory leaks
        if (lastUrl) {
          URL.revokeObjectURL(lastUrl);
        }
        setLastUrl(objectUrl);

        // Create the audio element lazily
        if (!audioRef.current) {
          audioRef.current = new Audio();
          
          // Set up event listeners
          audioRef.current.onplay = () => setIsPlaying(true);
          audioRef.current.onended = () => setIsPlaying(false);
          audioRef.current.onpause = () => setIsPlaying(false);
          audioRef.current.onerror = (e) => {
            logger.error('Audio playback error', { error: e }, "useTTS");
            setIsPlaying(false);
          };
        }

        // iOS/Chrome autoplay policy: play must be triggered by a user gesture
        audioRef.current.src = objectUrl;
        audioRef.current.currentTime = 0;

        await audioRef.current.play();
        
        logger.info('TTS playback started successfully', { voice }, "useTTS");
        
      } catch (error: any) {
        if (error.name === 'AbortError') {
          logger.debug('TTS request aborted', {}, "useTTS");
        } else {
          logger.error('TTS synthesis failed', { 
            error: error.message, 
            voice, 
            textLength: text.length 
          }, "useTTS");
          throw error;
        }
      } finally {
        setLoading(false);
      }
    };
  }, [lastUrl]);

  const stop = useMemo(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setLoading(false);
    };
  }, []);

  const setVolume = useMemo(() => {
    return (volume: number) => {
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, Math.min(1, volume));
      }
    };
  }, []);

  // Cleanup on unmount
  useMemo(() => {
    return () => {
      if (lastUrl) {
        URL.revokeObjectURL(lastUrl);
      }
      abortRef.current?.abort();
    };
  }, [lastUrl]);

  return { 
    play, 
    stop, 
    setVolume, 
    isLoading, 
    isPlaying 
  };
}