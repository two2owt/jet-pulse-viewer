import { useEffect, useState } from "react";
// Use optimized 256px WebP format - matches display size exactly
import jetLogo from "@/assets/jet-logo-256.webp";
import { Button } from "./ui/button";
import { SkipForward } from "lucide-react";

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen = ({ onComplete }: IntroScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Very short intro - 800ms is enough for branding, prioritize content
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 200); // Very fast fade out
    }, 800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onComplete, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ contain: 'layout style paint' }}
    >
      <div className="relative flex items-center justify-center">
        {/* Neumorphism container */}
        <div
          className="relative rounded-[3rem] p-16 animate-pulse-glow bg-background"
          style={{
            boxShadow: `
              20px 20px 60px hsl(var(--background) / 0.8),
              -20px -20px 60px hsl(var(--foreground) / 0.05),
              inset 5px 5px 10px hsl(var(--background) / 0.5),
              inset -5px -5px 10px hsl(var(--foreground) / 0.03)
            `,
          }}
        >
          {/* Logo container with inner neumorphism */}
          <div
            className="rounded-[2.5rem] p-12 animate-scale-in bg-background"
            style={{
              boxShadow: `
                inset 10px 10px 20px hsl(var(--background) / 0.8),
                inset -10px -10px 20px hsl(var(--foreground) / 0.05)
              `,
            }}
          >
            <img
              src={jetLogo}
              alt="JET Logo"
              className="w-32 h-32 object-contain"
              width="128"
              height="128"
              fetchPriority="high"
              decoding="sync"
            />
          </div>
        </div>

        {/* Glowing ring effect */}
        <div
          className="absolute inset-0 rounded-[3rem] animate-pulse"
          style={{
            background: `radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
        />
      </div>

      {/* Skip Button */}
      <Button
        onClick={handleSkip}
        variant="ghost"
        size="sm"
        className="absolute bottom-8 right-8 gap-2 text-muted-foreground hover:text-foreground"
      >
        Skip
        <SkipForward className="w-4 h-4" />
      </Button>
    </div>
  );
};
