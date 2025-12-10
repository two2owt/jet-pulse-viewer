import { useRef, useCallback, useEffect, useState } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface TimelapseSwipeControlProps {
  currentHour: number;
  isPlaying: boolean;
  loading: boolean;
  onHourChange: (hour: number) => void;
  onTogglePlay: () => void;
  formatHour: (hour: number) => string;
  stats?: {
    total_points: number;
  };
}

export const TimelapseSwipeControl = ({
  currentHour,
  isPlaying,
  loading,
  onHourChange,
  onTogglePlay,
  formatHour,
  stats,
}: TimelapseSwipeControlProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartHour = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  // Handle touch/swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStartX.current = clientX;
    touchStartHour.current = currentHour;
    setIsDragging(true);
  }, [currentHour]);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - touchStartX.current;
    const containerWidth = containerRef.current?.offsetWidth || 200;
    
    // Calculate hour change based on swipe distance
    // Full swipe across container = 6 hours
    const hourDelta = Math.round((deltaX / containerWidth) * 6);
    let newHour = (touchStartHour.current - hourDelta + 24) % 24;
    
    if (newHour !== currentHour) {
      onHourChange(newHour);
    }
  }, [isDragging, currentHour, onHourChange]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add mouse event listeners for desktop dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const clientX = e.clientX;
      const deltaX = clientX - touchStartX.current;
      const containerWidth = containerRef.current?.offsetWidth || 200;
      const hourDelta = Math.round((deltaX / containerWidth) * 6);
      let newHour = (touchStartHour.current - hourDelta + 24) % 24;
      onHourChange(newHour);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onHourChange]);

  const stepBackward = () => onHourChange((currentHour - 1 + 24) % 24);
  const stepForward = () => onHourChange((currentHour + 1) % 24);

  return (
    <div className="timelapse-swipe-control">
      {/* Compact inline control */}
      <div 
        ref={containerRef}
        className="flex items-center gap-1 bg-background/80 backdrop-blur-md rounded-full px-1 py-0.5 border border-border/50 touch-pan-x select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
      >
        {/* Step backward */}
        <button
          onClick={(e) => { e.stopPropagation(); stepBackward(); }}
          className="timelapse-touch-button flex-shrink-0"
          disabled={loading}
          aria-label="Previous hour"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>

        {/* Swipeable time display */}
        <div 
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full cursor-grab active:cursor-grabbing transition-colors ${
            isDragging ? 'bg-primary/20' : 'hover:bg-muted/50'
          }`}
        >
          <span className="text-xs font-semibold text-primary whitespace-nowrap min-w-[52px] text-center">
            {formatHour(currentHour)}
          </span>
          {stats && (
            <span className="text-[9px] text-muted-foreground hidden sm:inline">
              {stats.total_points.toLocaleString()}
            </span>
          )}
        </div>

        {/* Step forward */}
        <button
          onClick={(e) => { e.stopPropagation(); stepForward(); }}
          className="timelapse-touch-button flex-shrink-0"
          disabled={loading}
          aria-label="Next hour"
        >
          <ChevronRight className="w-3 h-3" />
        </button>

        {/* Play/Pause */}
        <Button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          variant={isPlaying ? "default" : "outline"}
          size="sm"
          className="h-7 w-7 p-0 rounded-full flex-shrink-0"
          disabled={loading}
        >
          {isPlaying ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3 ml-0.5" />
          )}
        </Button>
      </div>

      {/* Progress indicator dots */}
      <div className="flex justify-center gap-0.5 mt-1">
        {[0, 6, 12, 18].map((hour) => (
          <button
            key={hour}
            onClick={() => onHourChange(hour)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              Math.floor(currentHour / 6) === hour / 6
                ? 'bg-primary scale-125'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Jump to ${formatHour(hour)}`}
          />
        ))}
      </div>

      {/* Swipe hint on first use */}
      <p className="text-[8px] text-muted-foreground/60 text-center mt-0.5 sm:hidden">
        Swipe to change time
      </p>
    </div>
  );
};
