import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Connection {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at: string;
}

export const useConnections = (userId?: string) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchConnections();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_connections")
        .select("*")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) throw error;

      const accepted = (data?.filter((c) => c.status === "accepted") || []) as Connection[];
      const pending = (data?.filter(
        (c) => c.status === "pending" && c.friend_id === userId
      ) || []) as Connection[];

      setConnections(accepted);
      setPendingRequests(pending);
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (friendId: string) => {
    if (!userId) return { success: false, error: "User not authenticated" };

    try {
      const { data, error } = await supabase
        .from("user_connections")
        .insert({
          user_id: userId,
          friend_id: friendId,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error sending friend request:", error);
      return { success: false, error };
    }
  };

  const acceptRequest = async (connectionId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_connections")
        .update({ status: "accepted" })
        .eq("id", connectionId)
        .select()
        .single();

      if (error) throw error;

      setPendingRequests((prev) => prev.filter((c) => c.id !== connectionId));
      setConnections((prev) => [...prev, data as Connection]);
      return { success: true, data };
    } catch (error) {
      console.error("Error accepting request:", error);
      return { success: false, error };
    }
  };

  const removeConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from("user_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;

      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      setPendingRequests((prev) => prev.filter((c) => c.id !== connectionId));
      return { success: true };
    } catch (error) {
      console.error("Error removing connection:", error);
      return { success: false, error };
    }
  };

  return {
    connections,
    pendingRequests,
    loading,
    sendRequest,
    acceptRequest,
    removeConnection,
  };
};
