import React from 'https://esm.sh/react@18.3.1';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22';
import { VerificationEmail } from './_templates/verification-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const wh = new Webhook(hookSecret);
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string;
      };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
      };
    };

    console.log('Original redirect_to:', redirect_to);

    // Determine the app URL - use redirect_to if valid, otherwise default to Lovable domain
    let appUrl = redirect_to;
    if (!appUrl || appUrl.includes('localhost')) {
      // Default to the Lovable preview URL
      appUrl = 'https://dafac772-7908-4bdb-873c-58a805d7581e.lovableproject.com';
    }
    
    // Extract base URL properly
    const baseUrl = new URL(appUrl).origin;
    const customRedirectTo = `${baseUrl}/verification-success`;
    
    console.log('Using app URL:', baseUrl);
    console.log('Custom redirect to:', customRedirectTo);

    console.log('Sending verification email to:', user.email);
    console.log('Action type:', email_action_type);

    // Only send for signup verification emails
    if (email_action_type !== 'signup') {
      return new Response(
        JSON.stringify({ message: 'Not a signup verification email' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const html = await renderAsync(
      React.createElement(VerificationEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to: customRedirectTo,
        email_action_type,
      })
    );

    const { error } = await resend.emails.send({
      from: 'JET <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Verify your JET account',
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Verification email sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error) {
    console.error('Error sending verification email:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Failed to send verification email',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
