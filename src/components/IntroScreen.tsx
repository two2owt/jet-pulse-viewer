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
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 200);
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
      <img
        src={currentLogo}
        alt="JET Logo"
        className="w-full h-full object-contain"
        style={{
          animation: 'introZoomFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        fetchPriority="high"
        decoding="sync"
      />
      
      <style>{`
        @keyframes introZoomFade {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

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
