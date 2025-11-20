import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  pullThreshold?: number;
  maxPullDistance?: number;
  resistance?: number;
}

export const usePullToRefresh = ({
  onRefresh,
  pullThreshold = 80,
  maxPullDistance = 150,
  resistance = 2.5,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isEnabled = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only enable if scrolled to top
      if (container.scrollTop > 0) {
        isEnabled.current = false;
        return;
      }
      
      isEnabled.current = true;
      startY = e.touches[0].clientY;
      touchStartY.current = startY;
      isDragging = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !isEnabled.current || isRefreshing) return;

      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      // Only pull down, not up
      if (diff > 0) {
        // Apply resistance
        const distance = Math.min(diff / resistance, maxPullDistance);
        setPullDistance(distance);
        
        // Prevent default scroll if pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging || !isEnabled.current) return;
      
      isDragging = false;
      
      if (pullDistance >= pullThreshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onRefresh, pullThreshold, maxPullDistance, resistance, isRefreshing, pullDistance]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    pullThreshold,
  };
};
