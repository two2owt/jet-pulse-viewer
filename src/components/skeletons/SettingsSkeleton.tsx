import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const SettingsSkeleton = () => {
  return (
    <div 
      className="space-y-6"
      style={{
        // Containment prevents CLS propagation during hydration
        contain: 'layout style',
        transform: 'translateZ(0)',
      }}
    >
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Profile section */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </Card>

      {/* Settings sections */}
      {[1, 2, 3].map((section) => (
        <Card key={section} className="p-4 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="w-10 h-6 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Action buttons */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
};
