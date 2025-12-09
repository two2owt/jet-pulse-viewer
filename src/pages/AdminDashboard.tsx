import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealManagement } from "@/components/admin/DealManagement";
import { UserAnalytics } from "@/components/admin/UserAnalytics";
import { NeighborhoodManagement } from "@/components/admin/NeighborhoodManagement";
import { MonetizationToggle } from "@/components/admin/MonetizationToggle";
import { Loader2, Shield } from "lucide-react";

export default function AdminDashboard() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="deals" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="neighborhoods">Areas</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="deals">
            <DealManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <UserAnalytics />
          </TabsContent>

          <TabsContent value="neighborhoods">
            <NeighborhoodManagement />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <MonetizationToggle />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
