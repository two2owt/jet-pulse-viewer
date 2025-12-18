import { useEffect, useState, useMemo } from "react";
// Time-based logos - dark for night, light for day
import jetLogoDark from "@/assets/jet-logo-dark.jpg";
import jetLogoLight from "@/assets/jet-logo-light.jpg";
import { Button } from "./ui/button";
import { SkipForward } from "lucide-react";

// Determine if it's daytime based on user's local time (6am - 6pm)
const isDaytime = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
};

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen = ({ onComplete }: IntroScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  
  // Select logo based on time of day
  const currentLogo = useMemo(() => isDaytime() ? jetLogoLight : jetLogoDark, []);
  const isDay = useMemo(() => isDaytime(), []);

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
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        isDay ? "bg-white" : "bg-black"
      } ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      style={{ contain: 'layout style paint' }}
    >
      <div className="relative flex items-center justify-center">
        {/* Neumorphism container */}
        <div
          className={`relative rounded-[3rem] p-16 animate-pulse-glow ${isDay ? "bg-white" : "bg-black"}`}
          style={{
            boxShadow: isDay
              ? `
                20px 20px 60px rgba(0, 0, 0, 0.1),
                -20px -20px 60px rgba(255, 255, 255, 0.8),
                inset 5px 5px 10px rgba(0, 0, 0, 0.05),
                inset -5px -5px 10px rgba(255, 255, 255, 0.5)
              `
              : `
                20px 20px 60px rgba(0, 0, 0, 0.8),
                -20px -20px 60px rgba(255, 255, 255, 0.05),
                inset 5px 5px 10px rgba(0, 0, 0, 0.5),
                inset -5px -5px 10px rgba(255, 255, 255, 0.03)
              `,
          }}
        >
          {/* Logo container with inner neumorphism */}
          <div
            className={`rounded-[2.5rem] p-12 animate-scale-in ${isDay ? "bg-white" : "bg-black"}`}
            style={{
              boxShadow: isDay
                ? `
                  inset 10px 10px 20px rgba(0, 0, 0, 0.05),
                  inset -10px -10px 20px rgba(255, 255, 255, 0.8)
                `
                : `
                  inset 10px 10px 20px rgba(0, 0, 0, 0.8),
                  inset -10px -10px 20px rgba(255, 255, 255, 0.05)
                `,
            }}
          >
            <img
              src={currentLogo}
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
        className={`absolute bottom-8 right-8 gap-2 ${
          isDay ? "text-gray-500 hover:text-gray-900" : "text-gray-400 hover:text-white"
        }`}
      >
        Skip
        <SkipForward className="w-4 h-4" />
      </Button>
    </div>
  );
};
