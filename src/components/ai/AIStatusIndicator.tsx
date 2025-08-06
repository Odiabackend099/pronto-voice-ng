import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface AIStatusIndicatorProps {
  isConnected: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  volume: number;
  onToggleConnection: () => void;
  onVolumeChange: (volume: number) => void;
  className?: string;
}

const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  isConnected,
  isSpeaking,
  isListening,
  volume,
  onToggleConnection,
  onVolumeChange,
  className = ""
}) => {
  return (
    <div className={`flex items-center gap-4 p-4 bg-card/80 backdrop-blur-sm rounded-lg border ${className}`}>
      {/* AI Status */}
      <div className="flex items-center gap-2">
        <Bot className={`w-5 h-5 ${isConnected ? 'text-primary' : 'text-muted-foreground'}`} />
        <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
          }`} />
          {isConnected ? 'AI Connected' : 'AI Offline'}
        </Badge>
      </div>

      {/* Speaking Indicator */}
      {isSpeaking && (
        <Badge variant="default" className="gap-2 bg-green-500">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          AI Speaking
        </Badge>
      )}

      {/* Listening Indicator */}
      {isListening && (
        <Badge variant="default" className="gap-2 bg-blue-500">
          <Mic className="w-3 h-3" />
          Listening
        </Badge>
      )}

      {/* Volume Control */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
        >
          {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-16"
        />
      </div>

      {/* Connection Toggle */}
      <Button
        variant={isConnected ? "destructive" : "default"}
        size="sm"
        onClick={onToggleConnection}
        className="gap-2"
      >
        {isConnected ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {isConnected ? 'Disconnect' : 'Connect AI'}
      </Button>
    </div>
  );
};

export default AIStatusIndicator;