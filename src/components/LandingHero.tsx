import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Mic, Globe, Clock, Lock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import heroBackground from "@/assets/hero-background.webp";

const LandingHero = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="hero-section min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/25 to-background/35" />
        
        <div className="container mx-auto px-6 text-center relative z-10">
          {/* Logo and Brand */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-white/10 border border-primary/30">
                <img 
                  src="/lovable-uploads/98de0a9b-19cf-4161-8972-49fe7695d99b.png" 
                  alt="CrossAI Logo" 
                  className="w-12 h-12"
                />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-foreground">
                  Protect.NG CrossAI
                </h1>
                <p className="text-muted-foreground text-sm">
                  Nigerian Emergency Response Platform
                </p>
              </div>
            </div>
          </div>

          {/* Main Headline */}
          <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            When Seconds Count, We Listen
          </h2>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
            Nigeria's first voice-powered federal emergency response system. Speak your emergency in any
            Nigerian language and get immediate, professional assistance from our AI-powered response
            network.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Link to="/report">
              <Button className="emergency-button text-lg h-16 px-12 bg-primary hover:bg-primary/90 emergency-pulse">
                <Mic className="w-6 h-6 mr-3" />
                Start Emergency Response
              </Button>
            </Link>
            
            <Link to="/dashboard">
              <Button 
                variant="outline" 
                className="text-lg h-16 px-12 border-primary/30 text-foreground hover:bg-primary/10"
              >
                <Globe className="w-6 h-6 mr-3" />
                Emergency Dashboard
              </Button>
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Globe className="w-5 h-5 text-primary" />
              <span className="font-medium">Multi-Language Support</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-medium">24/7 Response</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Lock className="w-5 h-5 text-primary" />
              <span className="font-medium">Federal-Grade Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background/95">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-foreground mb-6">
              Advanced Emergency Response Technology
            </h3>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Powered by cutting-edge AI and designed specifically for Nigeria's diverse linguistic landscape
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 bg-card/50 border-primary/20 hover:bg-card/70 transition-colors">
              <div className="mb-6">
                <div className="p-3 rounded-lg bg-primary/10 w-fit">
                  <Mic className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-4">
                Voice-First Interface
              </h4>
              <p className="text-muted-foreground">
                Natural speech recognition in English, Pidgin, Hausa, Yoruba, and Igbo. 
                No typing required during emergencies.
              </p>
            </Card>

            <Card className="p-8 bg-card/50 border-primary/20 hover:bg-card/70 transition-colors">
              <div className="mb-6">
                <div className="p-3 rounded-lg bg-primary/10 w-fit">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-4">
                Real-Time Mapping
              </h4>
              <p className="text-muted-foreground">
                Precise GPS location with live incident tracking across Nigeria. 
                Visual emergency response coordination.
              </p>
            </Card>

            <Card className="p-8 bg-card/50 border-primary/20 hover:bg-card/70 transition-colors">
              <div className="mb-6">
                <div className="p-3 rounded-lg bg-primary/10 w-fit">
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-4">
                Federal Network
              </h4>
              <p className="text-muted-foreground">
                Connected to NEMA, State Emergency Agencies, and local first responders 
                for coordinated response.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold text-foreground mb-6">
            Ready to Report an Emergency?
          </h3>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Our AI-powered system is standing by 24/7 to assist you. 
            Every second matters in an emergency.
          </p>
          
          <Link to="/report">
            <Button className="emergency-button text-xl h-20 px-16 emergency-pulse">
              <Mic className="w-8 h-8 mr-4" />
              Start Emergency Report Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingHero;