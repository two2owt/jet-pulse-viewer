import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConnections } from "@/hooks/useConnections";
import { useNotifications } from "@/hooks/useNotifications";
import { Users, UserPlus, Loader2, Check, X, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { ConnectionProfileDialog } from "@/components/ConnectionProfileDialog";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function Social() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"map" | "explore" | "notifications" | "favorites" | "social">("social");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const { notifications } = useNotifications();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const {
    connections,
    pendingRequests,
    loading: connectionsLoading,
    sendRequest,
    acceptRequest,
    removeConnection,
  } = useConnections(user?.id);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      // Use discoverable_profiles view which only shows users who opted into discovery
      // and excludes already connected or pending users
      const { data, error } = await supabase
        .from("discoverable_profiles")
        .select("id, display_name, avatar_url")
        .limit(20);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (friendId: string) => {
    const result = await sendRequest(friendId);
    if (result.success) {
      toast.success("Friend request sent!");
    } else {
      toast.error("Failed to send request");
    }
  };

  const handleAcceptRequest = async (connectionId: string) => {
    const result = await acceptRequest(connectionId);
    if (result.success) {
      toast.success("Friend request accepted!");
    } else {
      toast.error("Failed to accept request");
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    const result = await removeConnection(connectionId);
    if (result.success) {
      toast.success("Connection removed");
    } else {
      toast.error("Failed to remove connection");
    }
  };

  const handleTabChange = (tab: "map" | "explore" | "notifications" | "favorites" | "social") => {
    setActiveTab(tab);
    if (tab === "map") {
      navigate("/");
    } else if (tab === "explore") {
      navigate("/?tab=explore");
    } else if (tab === "notifications") {
      navigate("/?tab=notifications");
    } else if (tab === "favorites") {
      navigate("/favorites");
    }
  };

  if (!user) {
    return (
      <>
        <Header 
          venues={[]}
          deals={[]}
          onVenueSelect={() => {}}
        />
        <div className="min-h-screen bg-background pb-20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <EmptyState
              icon={Users}
              title="Sign in to connect"
              description="Create an account to find and connect with friends, share deals, and build your social network"
              actionLabel="Sign In"
              onAction={() => navigate("/auth")}
            />
          </div>
        </div>
        <BottomNav 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          notificationCount={0}
        />
      </>
    );
  }

  if (loading || connectionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Header 
        venues={[]}
        deals={[]}
        onVenueSelect={() => {}}
      />
      <div className="min-h-screen bg-background pb-[calc(5rem+var(--safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto px-fluid-md py-fluid-lg gap-fluid-xl">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Friend Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={request.profile?.avatar_url || undefined} alt={request.profile?.display_name || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {request.profile?.display_name?.charAt(0)?.toUpperCase() || <Users className="w-6 h-6" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {request.profile?.display_name || "Friend Request"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Wants to connect with you
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request.id)}
                      className="bg-primary"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveConnection(request.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Friends */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            My Friends ({connections.length})
          </h2>
          {connections.length === 0 ? (
            <EmptyState
              icon={UserX}
              title="No friends yet"
              description="Start connecting with friends below to share deals and discover new spots together"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((connection) => {
                const friendId = connection.user_id === user?.id ? connection.friend_id : connection.user_id;
                return (
                  <div
                    key={connection.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                  >
                    <button
                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                      onClick={() => setSelectedProfileId(friendId)}
                    >
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={connection.profile?.avatar_url || undefined} alt={connection.profile?.display_name || "Friend"} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {connection.profile?.display_name?.charAt(0)?.toUpperCase() || <Users className="w-5 h-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-foreground truncate">
                        {connection.profile?.display_name || "Friend"}
                      </p>
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveConnection(connection.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Discover People */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Discover People
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || "User"} />
                    <AvatarFallback className="bg-accent/10 text-accent">
                      {profile.display_name?.charAt(0)?.toUpperCase() || <Users className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {profile.display_name || "User"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSendRequest(profile.id)}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
      
      <BottomNav 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        notificationCount={notifications.filter(n => !n.read).length}
      />

      {/* Connection Profile Dialog */}
      <ConnectionProfileDialog
        connectionId={selectedProfileId}
        isOpen={!!selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </>
  );
}
