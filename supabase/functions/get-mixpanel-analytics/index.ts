import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MIXPANEL_SERVICE_USERNAME = Deno.env.get('MIXPANEL_SERVICE_USERNAME');
const MIXPANEL_SERVICE_SECRET = Deno.env.get('MIXPANEL_SERVICE_SECRET');
const MIXPANEL_PROJECT_ID = '3683895';

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

    // Create Basic Auth header with username:secret
    const auth = btoa(`${MIXPANEL_SERVICE_USERNAME}:${MIXPANEL_SERVICE_SECRET}`);
    
    let endpoint = '';
    let params = new URLSearchParams();
    
    // Determine which Mixpanel endpoint to call based on metric
    switch(metric) {
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
