import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// For Mixpanel Query API v2.0, we use Project Token and API Secret
const MIXPANEL_PROJECT_TOKEN = Deno.env.get('MIXPANEL_PROJECT_TOKEN') || '6e47760af97cf264b5ec692df57d68f1';
const MIXPANEL_API_SECRET = Deno.env.get('MIXPANEL_API_SECRET') || '36d1fee6b381946129c9cca0ec5137fa';
const MIXPANEL_PROJECT_ID = '3935155';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metric, fromDate, toDate } = await req.json();
    
    console.log('Fetching Mixpanel data:', { metric, fromDate, toDate });
    console.log('Project Token:', MIXPANEL_PROJECT_TOKEN ? 'SET' : 'NOT SET');
    console.log('API Secret:', MIXPANEL_API_SECRET ? 'SET' : 'NOT SET');

    // Create Basic Auth header with project_token:api_secret for Query API v2.0
    const auth = btoa(`${MIXPANEL_PROJECT_TOKEN}:${MIXPANEL_API_SECRET}`);
    console.log('Auth header created (length):', auth.length);
    
    let endpoint = '';
    let params = new URLSearchParams();
    
    // Determine which Mixpanel endpoint to call based on metric
    switch(metric) {
      case 'test':
        // Test endpoint to verify authentication
        endpoint = 'https://mixpanel.com/api/app/me';
        break;
      
      case 'activeUsers':
        endpoint = 'https://mixpanel.com/api/2.0/engage';
        params.append('project_id', MIXPANEL_PROJECT_ID);
        break;
      
      case 'events':
        endpoint = 'https://mixpanel.com/api/2.0/events';
        params.append('project_id', MIXPANEL_PROJECT_ID);
        params.append('event', '["Page Viewed", "Deal Viewed", "Deal Clicked", "Button Clicked", "Search Performed"]');
        params.append('unit', 'day');
        params.append('type', 'general');
        params.append('from_date', fromDate);
        params.append('to_date', toDate);
        break;
      
      case 'topEvents':
        endpoint = 'https://mixpanel.com/api/2.0/events/top';
        params.append('project_id', MIXPANEL_PROJECT_ID);
        params.append('type', 'general');
        params.append('limit', '10');
        break;
        
      case 'funnels':
        endpoint = 'https://mixpanel.com/api/2.0/funnels';
        params.append('project_id', MIXPANEL_PROJECT_ID);
        params.append('from_date', fromDate);
        params.append('to_date', toDate);
        break;
      
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }

    const url = `${endpoint}?${params.toString()}`;
    console.log('Mixpanel API URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mixpanel API error:', response.status, errorText);
      throw new Error(`Mixpanel API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Mixpanel data received:', JSON.stringify(data).substring(0, 200));

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-mixpanel-analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Check edge function logs for more information'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
