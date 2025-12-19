import { useEffect, useState, useMemo } from "react";
// Transparent PNG logo for intro
import jetIntroLogo from "@/assets/jet-intro-logo.png";
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

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ 
        contain: 'layout style paint',
        backgroundColor: isDay ? '#ffffff' : '#000000'
      }}
    >
      <img
        src={jetIntroLogo}
        alt="JET Logo"
        className="w-64 h-64 object-contain"
        style={{
          animation: 'introFlyThrough 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        fetchPriority="high"
        decoding="sync"
      />
      
      <style>{`
        @keyframes introFlyThrough {
          0% { 
            transform: scale(0.85) translateY(30px); 
          }
          50% { 
            transform: scale(1) translateY(0); 
          }
          100% { 
            transform: scale(1.05) translateY(-20px); 
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
