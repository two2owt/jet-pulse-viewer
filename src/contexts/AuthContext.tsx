import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Only synchronous state updates here
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);

        // Handle specific auth events
        if (event === "TOKEN_REFRESHED") {
          console.log("Session token refreshed successfully");
        }

        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setIsLoading(false);
    });

    // Set up a visibility change listener to refresh session when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Attempt to refresh session when user returns to tab
        supabase.auth.getSession().then(({ data: { session: refreshedSession }, error }) => {
          if (error) {
            console.log("Session refresh check:", error.message);
            // Don't sign out on refresh errors - let the SDK handle token refresh
            return;
          }
          if (refreshedSession) {
            setSession(refreshedSession);
            setUser(refreshedSession.user);
          }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set up periodic session check (every 10 minutes)
    const intervalId = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
        if (!error && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }
      });
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
