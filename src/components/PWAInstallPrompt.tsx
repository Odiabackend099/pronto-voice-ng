import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onDismiss }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isInStandaloneMode = () => 
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator && (window.navigator as any).standalone) ||
      document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode());

    // Check if iOS
    const isIOSDevice = () => 
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    setIsIOS(isIOSDevice());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Don't show if already installed or dismissed recently
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) { // 7 days
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual install instructions
    if (isIOSDevice() && !isInStandaloneMode()) {
      const dismissed = localStorage.getItem('pwa-install-dismissed-ios');
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation dismissed');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    const timestamp = Date.now().toString();
    localStorage.setItem(isIOS ? 'pwa-install-dismissed-ios' : 'pwa-install-dismissed', timestamp);
    setShowPrompt(false);
    onDismiss?.();
  };

  // Don't show if already installed
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <Card className="bg-primary text-primary-foreground shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">
                Install Protect.NG CrossAI
              </h3>
              <p className="text-xs opacity-90 mb-3">
                {isIOS 
                  ? "Add to your home screen for quick emergency access. Tap the share button and select 'Add to Home Screen'."
                  : "Get faster access and offline capability by installing our app."
                }
              </p>
              
              <div className="flex gap-2">
                {!isIOS && deferredPrompt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleInstallClick}
                    className="text-xs h-8"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Install
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-xs h-8 text-primary-foreground/80 hover:text-primary-foreground"
                >
                  Later
                </Button>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-primary-foreground/80 hover:text-primary-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallPrompt;