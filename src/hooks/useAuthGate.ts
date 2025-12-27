import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

type GatedFeature = 
  | "favorites" 
  | "notifications" 
  | "social" 
  | "profile" 
  | "reviews";

const FEATURE_NAMES: Record<GatedFeature, string> = {
  favorites: "Saving favorites",
  notifications: "Notifications",
  social: "Social features",
  profile: "Your profile",
  reviews: "Writing reviews",
};

export const useAuthGate = () => {
  const { user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [promptFeature, setPromptFeature] = useState<string>("");

  const isAuthenticated = !!user;

  const requireAuth = useCallback(
    (feature: GatedFeature, onAuthenticated: () => void) => {
      if (isAuthenticated) {
        onAuthenticated();
        return true;
      }
      
      setPromptFeature(FEATURE_NAMES[feature]);
      setShowAuthPrompt(true);
      return false;
    },
    [isAuthenticated]
  );

  const closePrompt = useCallback(() => {
    setShowAuthPrompt(false);
    setPromptFeature("");
  }, []);

  return {
    isAuthenticated,
    showAuthPrompt,
    promptFeature,
    requireAuth,
    closePrompt,
  };
};
