import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface MerchantNotificationPayload {
  // For manual broadcast
  title: string;
  body: string;
  deal_id?: string;
  venue_id?: string;
  venue_name?: string;
  neighborhood_id?: string;
  
  // For auto-trigger on deal creation
  action?: 'deal_created' | 'deal_updated' | 'broadcast';
  deal_data?: {
    id: string;
    title: string;
    description: string;
    venue_name: string;
    venue_id: string;
    neighborhood_id?: string;
  };
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

async function sendVapidPush(
  subscription: PushSubscription,
  payload: { title: string; body: string; data: Record<string, unknown> },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; invalidSubscription: boolean }> {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh_key,
      auth: subscription.auth_key,
    },
  };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: `jet-merchant-${Date.now()}`,
    data: payload.data,
  });

  try {
    webpush.setVapidDetails(
      "mailto:support@jet-around.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    await webpush.sendNotification(pushSubscription, notificationPayload);
    console.log(`Push sent to user: ${subscription.user_id}`);
    return { success: true, invalidSubscription: false };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    console.error(`Push error for ${subscription.user_id}:`, err.message || err);
    
    // Subscription is invalid/expired
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { success: false, invalidSubscription: true };
    }
    
    return { success: false, invalidSubscription: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("JETBRIDGE_WEBHOOK_SECRET");
    const vapidPublicKey = Deno.env.get("VITE_VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notification service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook secret from JET Bridge
    const providedSecret = req.headers.get("x-webhook-secret");
    if (!webhookSecret || providedSecret !== webhookSecret) {
      console.error("Invalid or missing webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: MerchantNotificationPayload = await req.json();
    
    console.log("Merchant notification request:", JSON.stringify(payload));

    let notificationTitle: string;
    let notificationBody: string;
    let dealId: string | undefined;
    let venueId: string | undefined;
    let venueName: string | undefined;
    let neighborhoodId: string | undefined;

    // Handle different action types
    if (payload.action === 'deal_created' && payload.deal_data) {
      notificationTitle = `🔥 New Deal: ${payload.deal_data.title}`;
      notificationBody = `${payload.deal_data.venue_name} just posted a new deal! ${payload.deal_data.description.substring(0, 100)}`;
      dealId = payload.deal_data.id;
      venueId = payload.deal_data.venue_id;
      venueName = payload.deal_data.venue_name;
      neighborhoodId = payload.deal_data.neighborhood_id;
    } else if (payload.action === 'deal_updated' && payload.deal_data) {
      notificationTitle = `📢 Updated Deal: ${payload.deal_data.title}`;
      notificationBody = `${payload.deal_data.venue_name} updated their deal! ${payload.deal_data.description.substring(0, 100)}`;
      dealId = payload.deal_data.id;
      venueId = payload.deal_data.venue_id;
      venueName = payload.deal_data.venue_name;
      neighborhoodId = payload.deal_data.neighborhood_id;
    } else {
      // Manual broadcast
      notificationTitle = payload.title;
      notificationBody = payload.body;
      dealId = payload.deal_id;
      venueId = payload.venue_id;
      venueName = payload.venue_name;
      neighborhoodId = payload.neighborhood_id;
    }

    // Get target subscriptions
    let subscriptions: PushSubscription[] = [];

    if (neighborhoodId) {
      // Get users currently in the neighborhood
      const { data: locationData } = await supabase
        .from("user_locations")
        .select("user_id")
        .eq("current_neighborhood_id", neighborhoodId);

      if (locationData && locationData.length > 0) {
        const userIds = locationData.map((l) => l.user_id).filter(Boolean);
        
        if (userIds.length > 0) {
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("id, user_id, endpoint, p256dh_key, auth_key")
            .in("user_id", userIds)
            .eq("active", true);
          
          subscriptions = (subs || []) as PushSubscription[];
        }
      }
    } else {
      // Broadcast to all active subscriptions
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh_key, auth_key")
        .eq("active", true);
      
      subscriptions = (subs || []) as PushSubscription[];
    }

    console.log(`Found ${subscriptions.length} target subscriptions`);

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No target subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const invalidSubscriptions: string[] = [];

    // Send notifications
    for (const sub of subscriptions) {
      const result = await sendVapidPush(
        sub,
        {
          title: notificationTitle,
          body: notificationBody,
          data: {
            dealId: dealId || "",
            venueId: venueId || "",
            venueName: venueName || "",
            url: dealId ? `/?deal=${dealId}&venue=${encodeURIComponent(venueName || "")}` : "/",
          },
        },
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        // Log notification
        await supabase.from("notification_logs").insert({
          user_id: sub.user_id,
          title: notificationTitle,
          message: notificationBody,
          notification_type: "merchant_push",
          deal_id: dealId || null,
          neighborhood_id: neighborhoodId || null,
        });
        sentCount++;
      } else if (result.invalidSubscription) {
        invalidSubscriptions.push(sub.id);
      }
    }

    // Cleanup invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ active: false })
        .in("id", invalidSubscriptions);
      console.log(`Marked ${invalidSubscriptions.length} subscriptions as inactive`);
    }

    console.log(`Merchant notification complete: ${sentCount}/${subscriptions.length} sent`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: subscriptions.length,
        invalidated: invalidSubscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error in merchant-send-notification:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
