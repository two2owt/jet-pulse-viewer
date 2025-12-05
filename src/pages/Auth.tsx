import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Footer } from "@/components/Footer";
import jetLogo from "@/assets/jet-auth-logo.png";
import authBackground from "@/assets/auth-background.webp";

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
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; consent?: string }>({});
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);

  // Check if user is coming from password reset email
  useEffect(() => {
    const checkResetMode = async () => {
      const resetParam = searchParams.get('reset');
      if (resetParam === 'true') {
        // Verify there's a valid session from the reset link
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsResettingPassword(true);
        } else {
          toast.error("Invalid or expired reset link", {
            description: "Please request a new password reset link.",
          });
        }
      }
    };
    checkResetMode();
  }, [searchParams]);

  // Cooldown timer for resend verification
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Validate inputs before submission
  const validateInputs = (): boolean => {
    const errors: { email?: string; password?: string; confirmPassword?: string; consent?: string } = {};
    
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
      
      // Validate consent for signup
      if (isSignUp && !dataProcessingConsent) {
        errors.consent = "You must agree to the Privacy Policy and Terms of Service";
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResendVerification = async () => {
    // Validate email first
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error("Invalid email", {
        description: emailResult.error.errors[0].message,
      });
      return;
    }

    if (resendCooldown > 0) {
      toast.error("Please wait", {
        description: `You can resend in ${resendCooldown} seconds.`,
      });
      return;
    }

    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin.includes('localhost') 
            ? 'https://dafac772-7908-4bdb-873c-58a805d7581e.lovableproject.com/verification-success'
            : `${window.location.origin}/verification-success`,
        },
      });

      if (error) {
        if (error.message?.includes("rate limit")) {
          toast.error("Too many attempts", {
            description: "Please wait a few minutes before trying again.",
          });
          setResendCooldown(60);
        } else {
          throw error;
        }
        return;
      }

      toast.success("Verification email sent!", {
        description: "Please check your inbox and spam folder.",
      });
      setResendCooldown(60); // 60 second cooldown
    } catch (error: any) {
      toast.error("Failed to resend email", {
        description: "Please try again or contact support if the issue persists.",
      });
    } finally {
      setIsResending(false);
    }
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationErrors({});

    try {
      // Validate password
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        setValidationErrors({ password: passwordResult.error.errors[0].message });
        return;
      }

      // Validate password confirmation
      if (password !== confirmPassword) {
        setValidationErrors({ confirmPassword: "Passwords do not match" });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Password updated successfully", {
        description: "You can now sign in with your new password.",
      });
      
      // Clear the form and redirect to sign in
      setPassword("");
      setConfirmPassword("");
      setIsResettingPassword(false);
      navigate("/auth");
    } catch (error: any) {
      toast.error("Error updating password", {
        description: "Please try again or request a new reset link.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin.includes('localhost')
            ? 'https://dafac772-7908-4bdb-873c-58a805d7581e.lovableproject.com'
            : window.location.origin,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error("Google sign-in failed", {
        description: error.message || "Please try again or use email/password.",
      });
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
        // Use production URL or Lovable preview URL, never localhost
        const appUrl = window.location.origin.includes('localhost') 
          ? 'https://dafac772-7908-4bdb-873c-58a805d7581e.lovableproject.com'
          : window.location.origin;
        
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${appUrl}/verification-success`,
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

        // Store consent in profile after signup
        if (signUpData.user) {
          await supabase.from("profiles").update({
            data_processing_consent: dataProcessingConsent,
            data_processing_consent_date: new Date().toISOString(),
            location_consent_given: locationConsent,
            location_consent_date: locationConsent ? new Date().toISOString() : null,
          }).eq("id", signUpData.user.id);
        }

        toast.success("Check your email!", {
          description: "We sent you a verification link. Please verify your email to continue.",
        });
        setShowResendVerification(true);
        setPassword("");
        setConfirmPassword("");
        setDataProcessingConsent(false);
        setLocationConsent(false);
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
            setShowResendVerification(true);
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
          setShowResendVerification(true);
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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Animated matte black/grey gradient overlay */}
      <div className="absolute inset-0 auth-gradient-overlay" />
      <div className="w-full max-w-md relative z-10">
        {/* Glassmorphic Card */}
        <div className="backdrop-blur-xl bg-background/20 border border-border/30 rounded-2xl p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-24 h-24 flex items-center justify-center mx-auto">
              <img src={jetLogo} alt="JET Logo" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
            <h1 className="text-3xl font-bold text-foreground drop-shadow-sm">Welcome to JET</h1>
            <p className="text-muted-foreground">
              {isResettingPassword
                ? "Set your new password"
                : isForgotPassword
                ? "Reset your password"
                : isSignUp
                ? "Create an account to get started"
                : "Sign in to discover what's hot in your area"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={isResettingPassword ? handlePasswordReset : isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-4">
          {/* Email field - only show if not resetting password */}
          {!isResettingPassword && (
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
          )}

          {/* Password fields */}
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

              {(isSignUp || isResettingPassword) && (
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

              {/* Consent checkboxes for signup */}
              {isSignUp && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="dataConsent"
                      checked={dataProcessingConsent}
                      onCheckedChange={(checked) => {
                        setDataProcessingConsent(checked === true);
                        setValidationErrors(prev => ({ ...prev, consent: undefined }));
                      }}
                      className="mt-0.5"
                    />
                    <label htmlFor="dataConsent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <Link to="/privacy-policy" className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link to="/terms-of-service" className="text-primary hover:underline" target="_blank">
                        Terms of Service
                      </Link>
                      . I understand my data will be processed securely after inactivity.
                      <span className="text-destructive">*</span>
                    </label>
                  </div>
                  {validationErrors.consent && (
                    <p className="text-xs text-destructive ml-6">{validationErrors.consent}</p>
                  )}
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="locationConsent"
                      checked={locationConsent}
                      onCheckedChange={(checked) => setLocationConsent(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="locationConsent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      I consent to location tracking to receive personalized and nearby push notification deals. You can disable location tracking anytime in your profile settings.
                    </label>
                  </div>
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
            ) : isResettingPassword ? (
              "Update Password"
            ) : isForgotPassword ? (
              "Send Reset Link"
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Sign In"
            )}
          </Button>

          {/* Divider */}
          {!isForgotPassword && !isResettingPassword && (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background/20 backdrop-blur-sm px-3 text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>
          )}

          {/* Google Sign In */}
          {!isForgotPassword && !isResettingPassword && (
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-card/50 border-border/50 hover:bg-card/80 py-6 rounded-xl"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          )}
        </form>

        {/* Resend Verification Email */}
        {showResendVerification && !isResettingPassword && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
            <div className="text-sm text-muted-foreground">
              Didn't receive the verification email?
            </div>
            <Button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending || resendCooldown > 0}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {resendCooldown > 0 
                ? `Resend in ${resendCooldown}s` 
                : "Resend Verification Email"}
            </Button>
          </div>
        )}

        {/* Toggle & Forgot Password */}
        {!isResettingPassword && (
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
                setShowResendVerification(false);
                setValidationErrors({});
                setPassword("");
                setConfirmPassword("");
                setDataProcessingConsent(false);
                setLocationConsent(false);
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
        )}

          {/* Features */}
          <div className="bg-card/30 backdrop-blur-sm rounded-xl p-4 space-y-2 border border-border/30">
            <p className="text-xs font-semibold text-foreground">With an account you can:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Get real-time notifications for nearby deals</li>
              <li>• Save your favorite venues</li>
              <li>• Receive personalized recommendations</li>
              <li>• Track your activity and rewards</li>
            </ul>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Auth;
