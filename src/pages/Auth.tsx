import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
          },
        });

        if (error) throw error;

        toast.success("Account created!", {
          description: "Welcome to JET Charlotte",
        });
        navigate("/onboarding");
        return;
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

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
      toast.error("Authentication error", {
        description: error.message,
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
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-2xl flex items-center justify-center mx-auto shadow-[var(--shadow-glow)]">
            <Zap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to JET</h1>
          <p className="text-muted-foreground">
            {isSignUp
              ? "Create an account to get started"
              : "Sign in to discover what's hot in Charlotte"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-card border-border"
            />
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-card border-border"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-semibold py-6 rounded-xl shadow-[var(--shadow-glow)]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Toggle */}
        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
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
      </div>
    </div>
  );
};

export default Auth;
