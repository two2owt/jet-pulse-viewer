import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const SettingsSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" delay={0} />
        <Skeleton className="h-4 w-48" delay={75} />
      </div>

      {/* Profile section */}
      <Card className="p-4 space-y-4 bg-card/90 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" delay={150} />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" delay={200} />
            <Skeleton className="h-4 w-48" delay={250} />
          </div>
        </div>
      </Card>

      {/* Settings sections */}
      {[0, 1, 2].map((section) => (
        <Card key={section} className="p-4 space-y-4 bg-card/90 backdrop-blur-sm">
          <Skeleton className="h-5 w-40" delay={300 + section * 150} />
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded" delay={350 + section * 150 + item * 50} />
                  <Skeleton className="h-4 w-32" delay={375 + section * 150 + item * 50} />
                </div>
                <Skeleton className="w-10 h-6 rounded-full" delay={400 + section * 150 + item * 50} />
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Action buttons */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" delay={900} />
        <Skeleton className="h-10 w-full rounded-lg" delay={975} />
      </div>
    </div>
  );
};
