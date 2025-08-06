import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TranscriptEntry {
  text: string;
  language: string;
  timestamp: Date;
  confidence?: number;
}

interface TranscriptPanelProps {
  transcripts: TranscriptEntry[];
  currentLanguage?: string;
}

const TranscriptPanel = ({ transcripts, currentLanguage }: TranscriptPanelProps) => {
  const supportedLanguages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "ha", name: "Hausa", flag: "🇳🇬" },
    { code: "yo", name: "Yoruba", flag: "🇳🇬" },
    { code: "ig", name: "Igbo", flag: "🇳🇬" },
    { code: "pcm", name: "Pidgin", flag: "🇳🇬" }
  ];

  const getLanguageInfo = (code: string) => {
    return supportedLanguages.find(lang => lang.code === code) || supportedLanguages[0];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Card className="h-96 p-4 bg-card/80 backdrop-blur-sm border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Live Transcript</h3>
        {currentLanguage && (
          <Badge variant="outline" className="gap-2">
            {getLanguageInfo(currentLanguage).flag}
            {getLanguageInfo(currentLanguage).name}
          </Badge>
        )}
      </div>

      <ScrollArea className="h-80">
        <div className="space-y-3">
          {transcripts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Start speaking to see live transcription...</p>
              <p className="text-sm mt-2">Supports: English, Pidgin, Hausa, Yoruba, Igbo</p>
            </div>
          ) : (
            transcripts.map((entry, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs gap-1">
                    {getLanguageInfo(entry.language).flag}
                    {getLanguageInfo(entry.language).name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
                
                <p className="text-foreground leading-relaxed">
                  {entry.text}
                </p>
                
                {entry.confidence && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Confidence: {(entry.confidence * 100).toFixed(0)}%
                    </span>
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${entry.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Language support indicator */}
      <div className="mt-4 pt-4 border-t border-primary/20">
        <p className="text-xs text-muted-foreground mb-2">Supported Languages:</p>
        <div className="flex flex-wrap gap-1">
          {supportedLanguages.map((lang) => (
            <Badge 
              key={lang.code} 
              variant={currentLanguage === lang.code ? "default" : "outline"}
              className="text-xs gap-1"
            >
              {lang.flag} {lang.name}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default TranscriptPanel;