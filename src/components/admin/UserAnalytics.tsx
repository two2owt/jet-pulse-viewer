import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Bell, TrendingUp } from "lucide-react";
import { Loader2 } from "lucide-react";

export const UserAnalytics = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['user-analytics'],
    queryFn: async () => {
      const [usersRes, locationsRes, notificationsRes, profilesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_locations').select('id', { count: 'exact', head: true }),
        supabase.from('notification_logs').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('onboarding_completed'),
      ]);

      const completedOnboarding = profilesRes.data?.filter(p => p.onboarding_completed).length || 0;

      return {
        totalUsers: usersRes.count || 0,
        totalLocations: locationsRes.count || 0,
        totalNotifications: notificationsRes.count || 0,
        completedOnboarding,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      description: 'Registered users',
    },
    {
      title: 'Completed Onboarding',
      value: stats?.completedOnboarding || 0,
      icon: TrendingUp,
      description: 'Users who finished setup',
    },
    {
      title: 'Location Logs',
      value: stats?.totalLocations || 0,
      icon: MapPin,
      description: 'Total location checks',
    },
    {
      title: 'Notifications Sent',
      value: stats?.totalNotifications || 0,
      icon: Bell,
      description: 'Total push notifications',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">User Analytics</h2>
        <p className="text-muted-foreground">Platform usage statistics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
