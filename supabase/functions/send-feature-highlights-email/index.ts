import { Resend } from 'https://esm.sh/resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeatureEmailRequest {
  email: string;
  displayName: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName }: FeatureEmailRequest = await req.json();
    
    console.log(`Sending feature highlights email to ${email}`);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.98)); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 40px 40px 20px;">
                      <img src="https://www.jet-around.com/jet-email-logo.png" alt="JET" width="120" style="display: block;">
                    </td>
                  </tr>
                  
                  <!-- Title -->
                  <tr>
                    <td style="padding: 20px 40px;">
                      <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 26px; font-weight: 700; text-align: center;">
                        Discover What JET Can Do ✨
                      </h1>
                      <p style="margin: 0; color: #a0a0a0; font-size: 15px; text-align: center;">
                        Hey ${displayName}, here are the features that make JET special
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Feature 1: Live Heatmap -->
                  <tr>
                    <td style="padding: 20px 40px;">
                      <div style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 20px; border: 1px solid rgba(239, 68, 68, 0.2);">
                        <h3 style="margin: 0 0 10px; color: #ef4444; font-size: 18px; font-weight: 600;">
                          🔥 Live Activity Heatmap
                        </h3>
                        <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                          See where the action is in real-time. Our interactive heatmap shows you the hottest venues and busiest areas across Charlotte right now.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Feature 2: Exclusive Deals -->
                  <tr>
                    <td style="padding: 0 40px 20px;">
                      <div style="background: rgba(234, 179, 8, 0.1); border-radius: 12px; padding: 20px; border: 1px solid rgba(234, 179, 8, 0.2);">
                        <h3 style="margin: 0 0 10px; color: #eab308; font-size: 18px; font-weight: 600;">
                          🎁 Exclusive Venue Deals
                        </h3>
                        <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                          Access special offers from Charlotte's best restaurants, bars, and nightlife spots. Save money while discovering new favorites.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Feature 3: Social Discovery -->
                  <tr>
                    <td style="padding: 0 40px 20px;">
                      <div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 20px; border: 1px solid rgba(59, 130, 246, 0.2);">
                        <h3 style="margin: 0 0 10px; color: #3b82f6; font-size: 18px; font-weight: 600;">
                          👥 Social Discovery
                        </h3>
                        <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                          Connect with friends, share your favorite spots, and see what's trending in your network. Nightlife is better together.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Feature 4: Smart Notifications -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <div style="background: rgba(34, 197, 94, 0.1); border-radius: 12px; padding: 20px; border: 1px solid rgba(34, 197, 94, 0.2);">
                        <h3 style="margin: 0 0 10px; color: #22c55e; font-size: 18px; font-weight: 600;">
                          🔔 Smart Notifications
                        </h3>
                        <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                          Get alerts when you're near great deals or when your favorite venues have something special. Never miss an opportunity.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 0 40px 40px;">
                      <a href="https://www.jet-around.com" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Explore Features
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                      <p style="margin: 0; color: #666666; font-size: 13px; text-align: center; line-height: 1.6;">
                        You're receiving this because you signed up for JET.<br>
                        <a href="https://www.jet-around.com" style="color: #888888;">www.jet-around.com</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: 'JET <noreply@jet-around.com>',
      to: [email],
      subject: `${displayName}, discover what JET can do for you ✨`,
      html,
    });

    if (error) {
      console.error("Error sending feature highlights email:", error);
      throw error;
    }

    console.log("Feature highlights email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-feature-highlights-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
