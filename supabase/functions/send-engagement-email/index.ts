import { Resend } from 'https://esm.sh/resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EngagementEmailRequest {
  email: string;
  displayName: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName }: EngagementEmailRequest = await req.json();
    
    console.log(`Sending engagement email to ${email}`);

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
                        What's Happening Tonight? 🌃
                      </h1>
                      <p style="margin: 0; color: #a0a0a0; font-size: 15px; text-align: center; line-height: 1.6;">
                        Hey ${displayName}, Charlotte's nightlife is calling. Here's how to make the most of your JET experience.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Quick Actions -->
                  <tr>
                    <td style="padding: 20px 40px;">
                      <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 18px; font-weight: 600;">
                        Quick ways to get started:
                      </h2>
                    </td>
                  </tr>
                  
                  <!-- Action 1 -->
                  <tr>
                    <td style="padding: 0 40px 15px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.05); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);">
                        <tr>
                          <td width="60" style="padding: 16px; vertical-align: top;">
                            <div style="width: 40px; height: 40px; background: rgba(239, 68, 68, 0.2); border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">
                              📍
                            </div>
                          </td>
                          <td style="padding: 16px 16px 16px 0;">
                            <h4 style="margin: 0 0 4px; color: #ffffff; font-size: 15px; font-weight: 600;">Check the Heatmap</h4>
                            <p style="margin: 0; color: #888888; font-size: 13px;">See where people are heading tonight</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Action 2 -->
                  <tr>
                    <td style="padding: 0 40px 15px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.05); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);">
                        <tr>
                          <td width="60" style="padding: 16px; vertical-align: top;">
                            <div style="width: 40px; height: 40px; background: rgba(234, 179, 8, 0.2); border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">
                              ⭐
                            </div>
                          </td>
                          <td style="padding: 16px 16px 16px 0;">
                            <h4 style="margin: 0 0 4px; color: #ffffff; font-size: 15px; font-weight: 600;">Save Your First Favorite</h4>
                            <p style="margin: 0; color: #888888; font-size: 13px;">Bookmark deals you want to try</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Action 3 -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.05); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);">
                        <tr>
                          <td width="60" style="padding: 16px; vertical-align: top;">
                            <div style="width: 40px; height: 40px; background: rgba(59, 130, 246, 0.2); border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">
                              👥
                            </div>
                          </td>
                          <td style="padding: 16px 16px 16px 0;">
                            <h4 style="margin: 0 0 4px; color: #ffffff; font-size: 15px; font-weight: 600;">Connect with Friends</h4>
                            <p style="margin: 0; color: #888888; font-size: 13px;">Find people you know on JET</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Highlight Box -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(234, 179, 8, 0.15)); border-radius: 12px; padding: 20px; border: 1px solid rgba(239, 68, 68, 0.3); text-align: center;">
                        <p style="margin: 0 0 12px; color: #ffffff; font-size: 16px; font-weight: 600;">
                          🎯 Pro Tip
                        </p>
                        <p style="margin: 0; color: #a0a0a0; font-size: 14px; line-height: 1.6;">
                          Enable push notifications to get alerts when you're near deals. You'll never miss a great opportunity!
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 0 40px 40px;">
                      <a href="https://www.jet-around.com" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Open JET Now
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
      subject: `${displayName}, what's your plan tonight? 🌃`,
      html,
    });

    if (error) {
      console.error("Error sending engagement email:", error);
      throw error;
    }

    console.log("Engagement email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-engagement-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
