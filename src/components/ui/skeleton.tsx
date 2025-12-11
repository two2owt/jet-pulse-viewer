import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number; // delay in ms for staggered animations
}

function Skeleton({ className, delay = 0, style, ...props }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-shimmer",
        className
      )}
      style={{
        animationDelay: delay ? `${delay}ms` : undefined,
        ...style
      }}
      {...props} 
    />
  );
}

export { Skeleton };
