import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailSeriesUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  welcome_email_1_sent: boolean;
  welcome_email_2_sent: boolean;
  welcome_email_3_sent: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing welcome email series...");

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    // Get auth users with their emails
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    // Get profiles with email series tracking
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, created_at, welcome_email_1_sent, welcome_email_2_sent, welcome_email_3_sent');

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const results = {
      email1Sent: 0,
      email2Sent: 0,
      email3Sent: 0,
      errors: [] as string[],
    };

    for (const profile of profiles || []) {
      const authUser = authUsers.users.find(u => u.id === profile.id);
      if (!authUser?.email) continue;

      const userCreatedAt = new Date(profile.created_at);
      const displayName = profile.display_name || 'there';

      // Email 1: Welcome (sent immediately after signup, but we process for users created > 1 hour ago)
      if (!profile.welcome_email_1_sent) {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        if (userCreatedAt < oneHourAgo) {
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                email: authUser.email,
                displayName,
              }),
            });

            if (response.ok) {
              await supabase
                .from('profiles')
                .update({ welcome_email_1_sent: true })
                .eq('id', profile.id);
              results.email1Sent++;
              console.log(`Welcome email sent to ${authUser.email}`);
            } else {
              results.errors.push(`Failed to send welcome email to ${authUser.email}`);
            }
          } catch (err) {
            results.errors.push(`Error sending welcome email to ${authUser.email}: ${err}`);
          }
        }
      }

      // Email 2: Feature highlights (2 days after signup)
      if (profile.welcome_email_1_sent && !profile.welcome_email_2_sent && userCreatedAt < twoDaysAgo) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-feature-highlights-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              email: authUser.email,
              displayName,
            }),
          });

          if (response.ok) {
            await supabase
              .from('profiles')
              .update({ welcome_email_2_sent: true })
              .eq('id', profile.id);
            results.email2Sent++;
            console.log(`Feature highlights email sent to ${authUser.email}`);
          } else {
            results.errors.push(`Failed to send feature highlights email to ${authUser.email}`);
          }
        } catch (err) {
          results.errors.push(`Error sending feature highlights email to ${authUser.email}: ${err}`);
        }
      }

      // Email 3: Engagement prompt (4 days after signup)
      if (profile.welcome_email_2_sent && !profile.welcome_email_3_sent && userCreatedAt < fourDaysAgo) {
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-engagement-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              email: authUser.email,
              displayName,
            }),
          });

          if (response.ok) {
            await supabase
              .from('profiles')
              .update({ welcome_email_3_sent: true })
              .eq('id', profile.id);
            results.email3Sent++;
            console.log(`Engagement email sent to ${authUser.email}`);
          } else {
            results.errors.push(`Failed to send engagement email to ${authUser.email}`);
          }
        } catch (err) {
          results.errors.push(`Error sending engagement email to ${authUser.email}: ${err}`);
        }
      }
    }

    console.log("Welcome series processing complete:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in process-welcome-series:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
