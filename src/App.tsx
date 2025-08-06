import React, { useState, useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load components for better performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/auth/Login"));
const SignUp = lazy(() => import("./pages/auth/SignUp"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EmergencyReport = lazy(() => import("./pages/EmergencyReport"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EnhancedDashboard = lazy(() => import("./components/dashboard/EnhancedDashboard"));
const SplashScreen = lazy(() => import("./components/SplashScreen"));
const TelegramChatWidget = lazy(() => import("./components/TelegramChatWidget"));
const PWAInstallPrompt = lazy(() => import("./components/PWAInstallPrompt"));

// Production-optimized QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <img 
        src="/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png"
        alt="Protect.NG CrossAI"
        className="w-16 h-16 mx-auto"
      />
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
      <p className="text-sm text-muted-foreground">Loading emergency response system...</p>
    </div>
  </div>
);

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Authentication system unavailable');
          return;
        }

        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError('Failed to initialize authentication');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handle errors
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-destructive text-4xl">⚠️</div>
          <h1 className="text-xl font-semibold text-foreground">System Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show splash screen
  if (showSplash) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </Suspense>
    );
  }

  // Show loading screen
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter 
            future={{ 
              v7_startTransition: true, 
              v7_relativeSplatPath: true 
            }}
          >
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route 
                path="/login" 
                element={!session ? <Login /> : <Navigate to="/dashboard" replace />} 
              />
              <Route 
                path="/signup" 
                element={!session ? <SignUp /> : <Navigate to="/dashboard" replace />} 
              />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={session ? <EnhancedDashboard /> : <Navigate to="/login" replace />} 
              />
              <Route path="/report" element={<EmergencyReport />} />
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          
          {/* Global Components - Only load when needed */}
          <Suspense fallback={null}>
            <TelegramChatWidget />
            <PWAInstallPrompt />
            <Toaster />
            <Sonner />
          </Suspense>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;