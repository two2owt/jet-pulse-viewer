import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Circle, 
  Image, 
  FileText, 
  Shield, 
  Smartphone, 
  Bell, 
  Globe,
  Download,
  RotateCcw
} from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  description?: string;
  required: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // App Store Assets
  { id: "icon-1024", label: "App Icon (1024x1024)", category: "assets", description: "No transparency, no rounded corners", required: true },
  { id: "screenshots-6.7", label: "iPhone 6.7\" Screenshots (1290x2796)", category: "assets", required: true },
  { id: "screenshots-6.5", label: "iPhone 6.5\" Screenshots (1242x2688)", category: "assets", required: true },
  { id: "screenshots-5.5", label: "iPhone 5.5\" Screenshots (1242x2208)", category: "assets", required: true },
  { id: "screenshots-ipad-12.9", label: "iPad Pro 12.9\" Screenshots (2048x2732)", category: "assets", required: false },
  { id: "screenshots-ipad-11", label: "iPad Pro 11\" Screenshots (1668x2388)", category: "assets", required: false },
  
  // Metadata
  { id: "app-name", label: "App Name", category: "metadata", description: "Jet - Local Deals & Happy Hours", required: true },
  { id: "subtitle", label: "Subtitle (30 chars max)", category: "metadata", description: "Discover Nearby Specials", required: true },
  { id: "description", label: "App Description (4000 chars max)", category: "metadata", required: true },
  { id: "keywords", label: "Keywords (100 chars max)", category: "metadata", required: true },
  { id: "promotional-text", label: "Promotional Text (170 chars max)", category: "metadata", required: false },
  { id: "whats-new", label: "What's New / Version Notes", category: "metadata", required: true },
  { id: "category-primary", label: "Primary Category (Food & Drink)", category: "metadata", required: true },
  { id: "category-secondary", label: "Secondary Category (Lifestyle)", category: "metadata", required: false },
  
  // Legal & Compliance
  { id: "privacy-policy", label: "Privacy Policy URL", category: "legal", description: "Must be live and accessible", required: true },
  { id: "terms-of-service", label: "Terms of Service URL", category: "legal", description: "Must be live and accessible", required: true },
  { id: "support-url", label: "Support URL", category: "legal", required: true },
  { id: "age-rating", label: "Age Rating Questionnaire (17+)", category: "legal", required: true },
  { id: "content-rights", label: "Content Rights Declaration", category: "legal", required: true },
  { id: "export-compliance", label: "Export Compliance", category: "legal", required: true },
  
  // Technical
  { id: "bundle-id", label: "Bundle ID Configured", category: "technical", description: "app.lovable.dafac77279084bdb873c58a805d7581e", required: true },
  { id: "physical-device-test", label: "Tested on Physical Device", category: "technical", required: true },
  { id: "production-build", label: "Production Build Created", category: "technical", description: "Remove dev server URL from capacitor.config.ts", required: true },
  { id: "signing-configured", label: "Code Signing Configured", category: "technical", required: true },
  { id: "push-certificates", label: "Push Notification Certificates", category: "technical", required: true },
  
  // App Store Connect
  { id: "app-created", label: "App Created in App Store Connect", category: "connect", required: true },
  { id: "demo-account", label: "Demo Account Credentials (if needed)", category: "connect", required: false },
  { id: "reviewer-notes", label: "Notes for App Reviewer", category: "connect", required: false },
  { id: "app-preview-video", label: "App Preview Video", category: "connect", required: false },
  { id: "archive-uploaded", label: "Archive Uploaded to App Store Connect", category: "connect", required: true },
];

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  assets: { label: "App Store Assets", icon: <Image className="h-4 w-4" />, color: "text-blue-500" },
  metadata: { label: "Metadata", icon: <FileText className="h-4 w-4" />, color: "text-purple-500" },
  legal: { label: "Legal & Compliance", icon: <Shield className="h-4 w-4" />, color: "text-amber-500" },
  technical: { label: "Technical", icon: <Smartphone className="h-4 w-4" />, color: "text-green-500" },
  connect: { label: "App Store Connect", icon: <Globe className="h-4 w-4" />, color: "text-rose-500" },
};

const STORAGE_KEY = "jet-appstore-checklist";

export function AppStoreChecklist() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCheckedItems(new Set(JSON.parse(saved)));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const resetChecklist = () => {
    setCheckedItems(new Set());
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportChecklist = () => {
    const data = CHECKLIST_ITEMS.map((item) => ({
      ...item,
      completed: checkedItems.has(item.id),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "appstore-checklist.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRequired = CHECKLIST_ITEMS.filter((i) => i.required).length;
  const completedRequired = CHECKLIST_ITEMS.filter((i) => i.required && checkedItems.has(i.id)).length;
  const totalItems = CHECKLIST_ITEMS.length;
  const completedItems = checkedItems.size;
  const progressPercent = Math.round((completedRequired / totalRequired) * 100);

  const groupedItems = CHECKLIST_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const isReadyToSubmit = completedRequired === totalRequired;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            App Store Submission Checklist
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportChecklist}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={resetChecklist}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Required: {completedRequired}/{totalRequired}
            </span>
            <span className="text-muted-foreground">
              Total: {completedItems}/{totalItems}
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex items-center justify-between">
            <Badge variant={isReadyToSubmit ? "default" : "secondary"} className="gap-1">
              {isReadyToSubmit ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Ready to Submit
                </>
              ) : (
                <>
                  <Circle className="h-3 w-3" />
                  {totalRequired - completedRequired} required items remaining
                </>
              )}
            </Badge>
            <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => {
          const config = CATEGORY_CONFIG[category];
          const categoryCompleted = items.filter((i) => checkedItems.has(i.id)).length;
          const categoryTotal = items.length;

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className={`flex items-center gap-2 font-medium ${config.color}`}>
                  {config.icon}
                  {config.label}
                </div>
                <span className="text-xs text-muted-foreground">
                  {categoryCompleted}/{categoryTotal}
                </span>
              </div>

              <div className="space-y-2 pl-1">
                {items.map((item) => {
                  const isChecked = checkedItems.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-2 rounded-md transition-colors ${
                        isChecked ? "bg-muted/50" : "hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        id={item.id}
                        checked={isChecked}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={item.id}
                        className={`flex-1 cursor-pointer text-sm ${
                          isChecked ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.required && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              Required
                            </Badge>
                          )}
                        </span>
                        {item.description && (
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
