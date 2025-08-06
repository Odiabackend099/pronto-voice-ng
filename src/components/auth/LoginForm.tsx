import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Mail, Lock, ArrowRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    logger.info("Login attempt started", { email: data.email });

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        logger.error("Login failed", { error: authError.message });
        throw authError;
      }

      if (authData.user) {
        logger.info("Login successful", { userId: authData.user.id });
        
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
          duration: 3000,
        });

        // Redirect to dashboard after successful login
        navigate('/dashboard');
      }

    } catch (error: any) {
      logger.error("Login error", { error: error.message });
      
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error.message.includes("Invalid")) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Please check your email and click the verification link.";
      }
      
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Reset link sent",
        description: "Please check your email for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
            <img 
              src="/lovable-uploads/22dad437-2a21-49ca-9723-622f503676fa.png"
              alt="Protect.NG CrossAI"
              className="w-10 h-10"
            />
            Protect.NG CrossAI
          </h1>
          <p className="text-xl text-muted-foreground">
            Access Nigeria's emergency response network
          </p>
        </div>

        {/* Quick Emergency Access */}
        <Card className="mb-6 border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-foreground">Emergency?</h3>
                <p className="text-sm text-muted-foreground">Need immediate help?</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto"
                onClick={() => navigate('/report')}
              >
                Report Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Login Form */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your emergency response dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  {...register("email", { 
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Please enter a valid email address"
                    }
                  })}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register("password", { 
                    required: "Password is required" 
                  })}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="rememberMe" {...register("rememberMe")} />
                  <Label htmlFor="rememberMe" className="text-sm">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full emergency-button" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up here
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Security Features */}
        <div className="mt-6 space-y-3">
          <div className="text-center">
            <Badge variant="outline" className="glass-effect">
              <Shield className="w-4 h-4 mr-2" />
              End-to-end encrypted
            </Badge>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            Your privacy and security are our top priority. All data is encrypted
            and stored securely according to Nigerian data protection laws.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;