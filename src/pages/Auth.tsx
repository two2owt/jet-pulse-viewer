import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Footer } from "@/components/Footer";
import jetLogo from "@/assets/jet-auth-logo.png";

// Enhanced validation schemas
const emailSchema = z.string()
  .trim()
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be less than 72 characters" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" });

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  // Validate inputs before submission
  const validateInputs = (): boolean => {
    const errors: { email?: string; password?: string; confirmPassword?: string } = {};
    
    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      errors.email = emailResult.error.errors[0].message;
    }
    
    // Validate password for signup and signin
    if (!isForgotPassword) {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        errors.password = passwordResult.error.errors[0].message;
      }
      
      // Validate password confirmation for signup
      if (isSignUp && password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationErrors({});

    try {
      // Validate email
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        setValidationErrors({ email: emailResult.error.errors[0].message });
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast.success("Password reset email sent", {
        description: "Check your email for the password reset link.",
      });
      setEmail("");
      setIsForgotPassword(false);
    } catch (error: any) {
      // Enhanced error handling
      if (error.message?.includes("rate limit")) {
        toast.error("Too many requests", {
          description: "Please wait a few minutes before trying again.",
        });
      } else {
        toast.error("Error sending reset email", {
          description: "Please check your email and try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validate inputs
    if (!validateInputs()) {
      return;
    }
    
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
          },
        });

        // Enhanced error handling for signup
        if (error) {
          if (error.message?.includes("already registered")) {
            toast.error("Account already exists", {
              description: "This email is already registered. Please sign in instead.",
            });
            setIsSignUp(false);
            return;
          } else if (error.message?.includes("rate limit")) {
            toast.error("Too many attempts", {
              description: "Please wait a few minutes before trying again.",
            });
            return;
          }
          throw error;
        }

        toast.success("Check your email!", {
          description: "We sent you a verification link. Please verify your email to continue.",
        });
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        return;
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        // Enhanced error handling for signin
        if (error) {
          if (error.message?.includes("Invalid login credentials")) {
            toast.error("Invalid credentials", {
              description: "The email or password you entered is incorrect.",
            });
            return;
          } else if (error.message?.includes("Email not confirmed")) {
            toast.error("Email not verified", {
              description: "Please check your email and click the verification link.",
            });
            return;
          } else if (error.message?.includes("rate limit")) {
            toast.error("Too many attempts", {
              description: "Please wait a few minutes before trying again.",
            });
            return;
          }
          throw error;
        }

        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          toast.error("Email not verified", {
            description: "Please check your email and click the verification link before signing in.",
          });
          setIsLoading(false);
          return;
        }

        // Check if onboarding is completed
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", data.user.id)
          .single();

        toast.success("Signed in successfully");
        
        if (!profile?.onboarding_completed) {
          navigate("/onboarding");
          return;
        }
      }

      navigate("/");
    } catch (error: any) {
      // Generic error fallback (don't log sensitive data)
      toast.error("Authentication error", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-24 h-24 flex items-center justify-center mx-auto">
            <img src={jetLogo} alt="JET Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to JET</h1>
          <p className="text-muted-foreground">
            {isForgotPassword
              ? "Reset your password"
              : isSignUp
              ? "Create an account to get started"
              : "Sign in to discover what's hot in your area"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setValidationErrors(prev => ({ ...prev, email: undefined }));
              }}
              required
              className={`bg-card border-border ${validationErrors.email ? "border-destructive" : ""}`}
              autoComplete="email"
            />
            {validationErrors.email && (
              <p className="text-xs text-destructive">{validationErrors.email}</p>
            )}
          </div>

          {!isForgotPassword && (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setValidationErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    required
                    className={`bg-card border-border pr-10 ${validationErrors.password ? "border-destructive" : ""}`}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-xs text-destructive">{validationErrors.password}</p>
                )}
                {isSignUp && !validationErrors.password && (
                  <p className="text-xs text-muted-foreground">
                    Must be 8+ characters with uppercase, lowercase, and number
                  </p>
                )}
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }}
                      required
                      className={`bg-card border-border pr-10 ${validationErrors.confirmPassword ? "border-destructive" : ""}`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="text-xs text-destructive">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              )}
            </>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-semibold py-6 rounded-xl shadow-[var(--shadow-glow)]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isForgotPassword ? (
              "Send Reset Link"
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Toggle & Forgot Password */}
        <div className="text-center space-y-2">
          {!isForgotPassword && !isSignUp && (
            <button
              onClick={() => setIsForgotPassword(true)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors block w-full"
            >
              Forgot password?
            </button>
          )}
          
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsForgotPassword(false);
              setValidationErrors({});
              setPassword("");
              setConfirmPassword("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isForgotPassword 
              ? "Back to sign in"
              : isSignUp 
              ? "Already have an account? Sign in" 
              : "Don't have an account? Sign up"}
          </button>
        </div>

        {/* Features */}
        <div className="bg-card/50 rounded-xl p-4 space-y-2 border border-border/50">
          <p className="text-xs font-semibold text-foreground">With an account you can:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Get real-time notifications for nearby deals</li>
            <li>• Save your favorite venues</li>
            <li>• Receive personalized recommendations</li>
            <li>• Track your activity and rewards</li>
          </ul>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Auth;
