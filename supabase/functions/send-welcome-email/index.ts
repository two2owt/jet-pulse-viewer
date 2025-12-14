import { Resend } from 'https://esm.sh/resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  displayName: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName }: WelcomeEmailRequest = await req.json();
    
    console.log(`Sending welcome email to ${email}`);

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
                  
                  <!-- Welcome Message -->
                  <tr>
                    <td style="padding: 20px 40px;">
                      <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">
                        Welcome to JET, ${displayName}! 🎉
                      </h1>
                      <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6; text-align: center;">
                        You've just joined Charlotte's premier nightlife discovery platform. Get ready to explore exclusive deals and connect with the city's best venues.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- What's Next -->
                  <tr>
                    <td style="padding: 0 40px 30px;">
                      <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 24px; border: 1px solid rgba(255, 255, 255, 0.08);">
                        <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 18px; font-weight: 600;">
                          Here's what you can do now:
                        </h2>
                        <ul style="margin: 0; padding: 0 0 0 20px; color: #a0a0a0; font-size: 15px; line-height: 1.8;">
                          <li>📍 Explore deals near you on the interactive map</li>
                          <li>⭐ Save your favorite venues and deals</li>
                          <li>👥 Connect with friends and share discoveries</li>
                          <li>🔔 Enable notifications for exclusive alerts</li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 0 40px 40px;">
                      <a href="https://www.jet-around.com" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Start Exploring
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
      subject: `Welcome to JET, ${displayName}! 🎉`,
      html,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      throw error;
    }

    console.log("Welcome email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
