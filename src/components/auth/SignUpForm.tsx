import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Lock, User, Phone, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
  location: string;
  userType: 'citizen' | 'responder' | 'coordinator';
  agreeToTerms: boolean;
  emergencyContact: boolean;
}

const SignUpForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<'citizen' | 'responder' | 'coordinator'>('citizen');
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError
  } = useForm<SignUpFormData>();

  const password = watch("password");

  const userTypes = [
    {
      type: 'citizen' as const,
      title: 'Citizen',
      description: 'Report emergencies and get help',
      icon: User,
      features: ['Emergency reporting', 'Real-time assistance', 'Location sharing']
    },
    {
      type: 'responder' as const,
      title: 'First Responder',
      description: 'Respond to emergency calls',
      icon: Shield,
      features: ['Receive emergency alerts', 'Coordinate responses', 'Team communication']
    },
    {
      type: 'coordinator' as const,
      title: 'Emergency Coordinator',
      description: 'Manage emergency operations',
      icon: AlertTriangle,
      features: ['Dashboard access', 'Team management', 'Analytics & reporting']
    }
  ];

  const onSubmit = async (data: SignUpFormData) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", { message: "Passwords do not match" });
      return;
    }

    if (!data.agreeToTerms) {
      setError("agreeToTerms", { message: "You must agree to the terms and conditions" });
      return;
    }

    setIsLoading(true);
    logger.info("Sign up attempt started", { email: data.email, userType: data.userType });

    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone_number: data.phoneNumber,
            location: data.location,
            user_type: data.userType,
            emergency_contact: data.emergencyContact
          }
        }
      });

      if (authError) {
        logger.error("Sign up failed", { error: authError.message });
        throw authError;
      }

      if (authData.user) {
        logger.info("Sign up successful", { userId: authData.user.id });
        
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account.",
          duration: 5000,
        });

        // Redirect to dashboard after successful signup
        navigate('/dashboard');
      }

    } catch (error: any) {
      logger.error("Sign up error", { error: error.message });
      
      toast({
        title: "Sign up failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
            <Shield className="w-10 h-10 text-primary" />
            Protect.NG CrossAI
          </h1>
          <p className="text-xl text-muted-foreground">
            Join Nigeria's AI-powered emergency response network
          </p>
        </div>

        <Card className="glass-card border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Create Your Account</CardTitle>
            <CardDescription>
              Choose your role and help build a safer Nigeria
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* User Type Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-foreground">Choose Your Role</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {userTypes.map((userType) => {
                    const Icon = userType.icon;
                    const isSelected = selectedUserType === userType.type;
                    
                    return (
                      <Card
                        key={userType.type}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedUserType(userType.type)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{userType.title}</h3>
                              <p className="text-sm text-muted-foreground">{userType.description}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {userType.features.map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle className="w-3 h-3 text-primary" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <input type="hidden" {...register("userType")} value={selectedUserType} />
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    {...register("fullName", { 
                      required: "Full name is required",
                      minLength: { value: 2, message: "Name must be at least 2 characters" }
                    })}
                    className={errors.fullName ? "border-destructive" : ""}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+234 XXX XXX XXXX"
                    {...register("phoneNumber", { 
                      required: "Phone number is required",
                      pattern: {
                        value: /^[\+]?[234]\d{10,13}$/,
                        message: "Please enter a valid Nigerian phone number"
                      }
                    })}
                    className={errors.phoneNumber ? "border-destructive" : ""}
                  />
                  {errors.phoneNumber && (
                    <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location (State/City)
                </Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="e.g., Lagos, Nigeria"
                  {...register("location", { 
                    required: "Location is required" 
                  })}
                  className={errors.location ? "border-destructive" : ""}
                />
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location.message}</p>
                )}
              </div>

              {/* Account Credentials */}
              <div className="space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      {...register("password", { 
                        required: "Password is required",
                        minLength: { value: 8, message: "Password must be at least 8 characters" },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                          message: "Password must contain uppercase, lowercase, and numbers"
                        }
                      })}
                      className={errors.password ? "border-destructive" : ""}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      {...register("confirmPassword", { 
                        required: "Please confirm your password",
                        validate: value => value === password || "Passwords do not match"
                      })}
                      className={errors.confirmPassword ? "border-destructive" : ""}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Emergency Contact */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="emergencyContact" {...register("emergencyContact")} />
                  <Label htmlFor="emergencyContact" className="text-sm">
                    I want to be notified of emergencies in my area
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="agreeToTerms" 
                    {...register("agreeToTerms", { required: "You must agree to the terms" })}
                  />
                  <Label htmlFor="agreeToTerms" className="text-sm">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-sm text-destructive">{errors.agreeToTerms.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full emergency-button" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Security Badge */}
        <div className="text-center mt-6">
          <Badge variant="outline" className="glass-effect">
            <Shield className="w-4 h-4 mr-2" />
            Protected by enterprise-grade security
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;