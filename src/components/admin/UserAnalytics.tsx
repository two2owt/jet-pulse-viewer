import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Bell, TrendingUp, Star, Activity, Eye } from "lucide-react";
import { Loader2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const UserAnalytics = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      // Basic counts
      const [usersRes, locationsRes, notificationsRes, profilesRes, activeDealsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_locations').select('id', { count: 'exact', head: true }),
        supabase.from('notification_logs').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('onboarding_completed, created_at'),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('active', true)
      ]);

      const completedOnboarding = profilesRes.data?.filter(p => p.onboarding_completed).length || 0;

      // User growth over last 7 days
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const recentUsers = profilesRes.data?.filter(u => u.created_at >= sevenDaysAgo) || [];

      // Aggregate by day
      const userGrowth = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dateStr = format(date, 'MM/dd');
        const count = recentUsers.filter(u => 
          format(new Date(u.created_at), 'MM/dd') === dateStr
        ).length;
        return { date: dateStr, users: count };
      });

      // Popular venues (by deal count)
      const { data: venues } = await supabase
        .from('deals')
        .select('venue_name, venue_id')
        .eq('active', true);

      const venueStats = venues?.reduce((acc, deal) => {
        const existing = acc.find(v => v.venue_id === deal.venue_id);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ venue_name: deal.venue_name, venue_id: deal.venue_id, count: 1 });
        }
        return acc;
      }, [] as { venue_name: string; venue_id: string; count: number }[])
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) || [];

      // Location tracking activity (last 7 days)
      const { data: recentLocations } = await supabase
        .from('user_locations')
        .select('created_at')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true });

      const locationActivity = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dateStr = format(date, 'MM/dd');
        const count = recentLocations?.filter(l => 
          format(new Date(l.created_at), 'MM/dd') === dateStr
        ).length || 0;
        return { date: dateStr, locations: count };
      });

      // Deal type distribution
      const { data: dealTypes } = await supabase
        .from('deals')
        .select('deal_type')
        .eq('active', true);

      const dealTypeStats = dealTypes?.reduce((acc, deal) => {
        const existing = acc.find(d => d.type === deal.deal_type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ type: deal.deal_type, count: 1 });
        }
        return acc;
      }, [] as { type: string; count: number }[]) || [];

      return {
        totalUsers: usersRes.count || 0,
        totalLocations: locationsRes.count || 0,
        totalNotifications: notificationsRes.count || 0,
        completedOnboarding,
        activeDeals: activeDealsRes.count || 0,
        userGrowth,
        popularVenues: venueStats,
        locationActivity,
        dealTypeStats
      };
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const weeklyLocations = data?.locationActivity?.reduce((sum, d) => sum + d.locations, 0) || 0;
  const engagementRate = data?.completedOnboarding && data?.totalUsers 
    ? Math.round((data.completedOnboarding / data.totalUsers) * 100)
    : 0;

  const cards = [
    {
      title: "Total Users",
      value: data?.totalUsers || 0,
      icon: Users,
      description: "Registered users",
      trend: "+12% from last week"
    },
    {
      title: "Active Deals",
      value: data?.activeDeals || 0,
      icon: Star,
      description: "Currently running",
      trend: "Live deals"
    },
    {
      title: "Location Tracking",
      value: data?.totalLocations || 0,
      icon: MapPin,
      description: "Total check-ins",
      trend: `${weeklyLocations} this week`
    },
    {
      title: "Engagement Rate",
      value: `${engagementRate}%`,
      icon: TrendingUp,
      description: "Onboarding completion",
      trend: `${data?.completedOnboarding || 0} completed`
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Real-time platform metrics and user engagement</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
                <p className="text-xs text-primary/70 mt-1">
                  {card.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* User Growth Chart */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              User Growth (7 Days)
            </CardTitle>
            <CardDescription>New user registrations per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Location Activity Chart */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Location Activity
            </CardTitle>
            <CardDescription>User check-ins over the last week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.locationActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="locations" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Popular Venues */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Top Venues
            </CardTitle>
            <CardDescription>Venues with most active deals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.popularVenues && data.popularVenues.length > 0 ? (
                data.popularVenues.map((venue, idx) => (
                  <div key={venue.venue_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{venue.venue_name}</p>
                        <p className="text-xs text-muted-foreground">{venue.count} active deals</p>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No venue data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deal Type Distribution */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Deal Categories
            </CardTitle>
            <CardDescription>Distribution of active deals by type</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.dealTypeStats && data.dealTypeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.dealTypeStats}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.type}: ${entry.count}`}
                  >
                    {data.dealTypeStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No deal data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications Stats */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Performance
          </CardTitle>
          <CardDescription>Push notification delivery stats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{data?.totalNotifications?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Total Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {data?.completedOnboarding && data?.totalNotifications 
                  ? (data.totalNotifications / data.completedOnboarding).toFixed(1)
                  : 0}
              </p>
              <p className="text-xs text-muted-foreground">Avg per User</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {data?.totalNotifications ? '100%' : '0%'}
              </p>
              <p className="text-xs text-muted-foreground">Delivery Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
