import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload = await req.json();
    const deal = payload.record;

    // Call the send-admin-notification function
    const { error } = await supabase.functions.invoke("send-admin-notification", {
      body: {
        type: "new_deal",
        subject: "New Deal Created",
        message: `A new deal has been created on JetStream.`,
        details: {
          "Deal Title": deal.title,
          "Venue": deal.venue_name,
          "Deal Type": deal.deal_type,
          "Description": deal.description,
          "Starts At": new Date(deal.starts_at).toLocaleString(),
          "Expires At": new Date(deal.expires_at).toLocaleString(),
        },
      },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in notify-admin-new-deal:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
