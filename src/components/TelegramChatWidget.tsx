import React, { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Extend Window interface for Telegram
declare global {
  interface Window {
    Telegram?: any;
  }
}

interface TelegramChatWidgetProps {
  botUsername?: string;
  className?: string;
}

const TelegramChatWidget: React.FC<TelegramChatWidgetProps> = ({ 
  botUsername = "Cross_Aibot", 
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Telegram Web App script if not already loaded
    if (!window.Telegram) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsLoaded(true);
    }
  }, []);

  const openTelegramChat = () => {
    const telegramUrl = `https://t.me/${botUsername}`;
    
    // Try to open in Telegram app first, fallback to web
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    
    if (isMobile) {
      // For mobile, try Telegram app first
      window.location.href = `tg://resolve?domain=${botUsername}`;
      
      // Fallback to web version after a short delay
      setTimeout(() => {
        window.open(telegramUrl, '_blank');
      }, 1000);
    } else {
      // For desktop, open web version directly
      window.open(telegramUrl, '_blank', 'width=400,height=600,resizable=yes,scrollbars=yes');
    }
  };

  const toggleWidget = () => {
    if (!isOpen) {
      openTelegramChat();
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={toggleWidget}
          className="w-14 h-14 rounded-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white shadow-lg transition-all duration-300 transform hover:scale-105"
          size="icon"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Chat Widget Popup */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 max-w-[calc(100vw-3rem)]">
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="bg-[#0088cc] text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-[#0088cc]" />
                </div>
                Emergency Support Bot
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto w-6 h-6 text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                Get instant support for emergencies and technical assistance through our Telegram bot.
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  24/7 Emergency Support
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Technical Assistance
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Real-time Updates
                </div>
              </div>

              <Button 
                onClick={openTelegramChat}
                className="w-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Chat on Telegram
              </Button>

              <div className="text-xs text-center text-muted-foreground">
                Click to open @{botUsername} in Telegram
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default TelegramChatWidget;