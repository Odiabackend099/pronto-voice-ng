import React, { useEffect } from 'react';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    // Optimized splash duration for production
    const timer = setTimeout(() => {
      onComplete();
    }, 1500); // Reduced from 2500ms for better UX

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-background to-background/90 flex items-center justify-center z-50">
      <div className="text-center space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative p-8 rounded-full bg-card/80 backdrop-blur-md border border-primary/20">
            <img 
              src="/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png"
              alt="Protect.NG CrossAI"
              className="w-24 h-24 mx-auto"
            />
          </div>
        </div>

        {/* App Name */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Protect.NG CrossAI
          </h1>
          <p className="text-lg text-muted-foreground">
            Nigerian Emergency Response Platform
          </p>
        </div>

        {/* Loading Animation */}
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;