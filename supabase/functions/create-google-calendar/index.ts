// FIX: Corrected the Supabase edge function types reference path to ensure TypeScript can find the Deno runtime type definitions.
/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/dist/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST',
      },
    });
  }

  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing access token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'SoulMatch Events Kalender',
        description: 'En dedikeret kalender til alle de events, du deltager i via SoulMatch.',
        timeZone: 'Europe/Copenhagen',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Google API Error:', data);
      throw new Error(data.error?.message || 'Failed to create calendar');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error creating calendar:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// FIX: Add an empty export to treat this file as a module and prevent global scope pollution.
export {};
