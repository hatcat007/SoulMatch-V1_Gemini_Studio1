// Vercel Edge Functions provide a Request-like and Response-like API.
// We need to import the types to ensure we're using them correctly.
// This is a simplified setup for Vercel, assuming a NodeJS runtime.
// If you are using Edge runtime, the imports would be slightly different.

// FIX: Corrected the Supabase edge function types reference path to ensure TypeScript can find the Deno runtime type definitions.
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
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
    const { code } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new Error('Missing Google environment variables');
    }

    // Step 1: Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      throw new Error(tokens.error_description || 'Failed to exchange token');
    }

    // Step 2: Fetch user's email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json();
    if (!userInfoResponse.ok) throw new Error('Failed to fetch user info');

    // Step 3: Fetch user's writable calendars
    const calendarListResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const calendarList = await calendarListResponse.json();
    if (!calendarListResponse.ok) throw new Error('Failed to fetch calendar list');

    const calendars = calendarList.items.map((cal: any) => ({
        id: cal.id,
        summary: cal.summary,
    }));

    return new Response(JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: Date.now() + tokens.expires_in * 1000,
      email: userInfo.email,
      calendars: calendars,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// FIX: Add an empty export to treat this file as a module and prevent global scope pollution.
export {};