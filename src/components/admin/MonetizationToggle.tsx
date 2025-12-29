import { useState, useEffect } from "react";
import { DollarSign, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Import from the lightweight utility module (no UI dependencies)
import {
  type MonetizationOverride,
  getMonetizationOverride,
  setMonetizationOverride,
  isMonetizationEnabled,
  getMonetizationReleaseDate,
} from "@/lib/monetization";

// Re-export for backwards compatibility with any code that imports from this file
export { isMonetizationEnabled, getMonetizationOverride, type MonetizationOverride };

export const MonetizationToggle = () => {
  const [override, setOverride] = useState<MonetizationOverride>("auto");
  const releaseDate = getMonetizationReleaseDate();
  const isBeforeRelease = new Date() < releaseDate;

  useEffect(() => {
    setOverride(getMonetizationOverride());
  }, []);

  const handleToggle = (value: MonetizationOverride) => {
    setOverride(value);
    setMonetizationOverride(value);
    toast.success(`Monetization ${value === "auto" ? "set to auto" : value}`, {
      description: value === "auto" 
        ? `Will activate on ${releaseDate.toLocaleDateString()}`
        : `Feature gating is now ${value}`,
    });
    // Trigger a page reload to apply changes
    window.location.reload();
  };

  const getStatusBadge = () => {
    const isActive = isMonetizationEnabled();
    if (override === "auto") {
      return isActive ? (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active (Auto)</Badge>
      ) : (
        <Badge variant="secondary">Inactive (Auto)</Badge>
      );
    }
    return override === "enabled" ? (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Test Mode
      </Badge>
    ) : (
      <Badge variant="outline">Disabled</Badge>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Monetization Features</CardTitle>
              <CardDescription>
                Control subscription feature gating
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scheduled release: <span className="font-medium text-foreground">{releaseDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          {isBeforeRelease && " (not yet active)"}
        </p>

        <div className="space-y-3">
          {/* Auto Mode */}
          <div 
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              override === "auto" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
            }`}
            onClick={() => handleToggle("auto")}
          >
            <div>
              <p className="font-medium text-foreground">Auto (Recommended)</p>
              <p className="text-sm text-muted-foreground">Activates on release date</p>
            </div>
            <Switch checked={override === "auto"} />
          </div>

          {/* Force Enable */}
          <div 
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              override === "enabled" ? "border-yellow-500 bg-yellow-500/5" : "border-border hover:border-muted-foreground/50"
            }`}
            onClick={() => handleToggle("enabled")}
          >
            <div>
              <p className="font-medium text-foreground">Enable for Testing</p>
              <p className="text-sm text-muted-foreground">Force subscription gating now</p>
            </div>
            <Switch checked={override === "enabled"} />
          </div>

          {/* Force Disable */}
          <div 
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              override === "disabled" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
            }`}
            onClick={() => handleToggle("disabled")}
          >
            <div>
              <p className="font-medium text-foreground">Disable</p>
              <p className="text-sm text-muted-foreground">All features accessible to everyone</p>
            </div>
            <Switch checked={override === "disabled"} />
          </div>
        </div>

        {override === "enabled" && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-200">
              Test mode active. Users without subscriptions will see upgrade prompts for JET+ and JETx features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
