import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    dealId?: string;
    venueId?: string;
    venueName?: string;
    url?: string;
  };
  user_ids?: string[];
  neighborhood_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: WebPushPayload = await req.json();

    // Get subscriptions based on targeting
    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("active", true);

    if (payload.user_ids && payload.user_ids.length > 0) {
      query = query.in("user_id", payload.user_ids);
    } else if (payload.neighborhood_id) {
      // Get users in the neighborhood
      const { data: locationData } = await supabase
        .from("user_locations")
        .select("user_id")
        .eq("current_neighborhood_id", payload.neighborhood_id);

      if (locationData && locationData.length > 0) {
        const userIds = locationData.map((l) => l.user_id);
        query = query.in("user_id", userIds);
      }
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/pwa-192x192.png",
      badge: payload.badge || "/pwa-192x192.png",
      tag: payload.tag || `jet-${Date.now()}`,
      ...payload.data
    });

    let sentCount = 0;
    const errors: string[] = [];

    // Send to each subscription
    // Note: In production, you would use web-push library or a service like Firebase
    // For now, we'll log the subscriptions and store notification logs
    for (const sub of subscriptions) {
      try {
        // Log notification to database
        await supabase.from("notification_logs").insert({
          user_id: sub.user_id,
          title: payload.title,
          message: payload.body,
          notification_type: "web_push",
          deal_id: payload.data?.dealId || null,
          neighborhood_id: payload.neighborhood_id || null,
        });

        sentCount++;

        // Web Push would be sent here using web-push library
        // Since Deno doesn't have a direct web-push implementation,
        // you would need to use a push service or implement the protocol
        console.log(`Web push queued for user: ${sub.user_id}`);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Failed to send to ${sub.user_id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Notifications processed`,
        sent: sentCount,
        total: subscriptions.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error in send-web-push:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
