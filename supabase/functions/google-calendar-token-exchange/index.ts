// FIX: Updated the Deno types reference to a specific, versioned URL to resolve TypeScript errors.
// This should prevent issues with unversioned or redirecting URLs for type definitions.
/// <reference types="https://deno.land/x/deno@v1.30.0/types.d.ts" />

// supabase/functions/google-calendar-token-exchange/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Disse CORS headers er VIGTIGE, så din frontend-app (fra browseren) kan kalde denne function.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For udvikling. I produktion bør dette være din app's URL.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Håndter CORS preflight request, som browseren sender før selve POST-kaldet.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Modtag 'authorization_code' fra frontend.
    const { code } = await req.json();
    if (!code) {
      throw new Error('Authorization code mangler.');
    }

    // 2. Hent dine hemmelige nøgler sikkert fra Supabase secrets.
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
        throw new Error('Google credentials er ikke konfigureret korrekt på serveren.');
    }

    // 3. Forbered anmodningen til Google's token endpoint.
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams();
    params.append('client_id', GOOGLE_CLIENT_ID);
    params.append('client_secret', GOOGLE_CLIENT_SECRET);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', GOOGLE_REDIRECT_URI);

    // 4. Send anmodningen til Google for at bytte koden til et token.
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Fejl fra Google: ${errorData.error_description || tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    
    // 5. Hent brugerens email ved at bruge det nye access_token
     const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
        }
    });

    if(!userInfoResponse.ok) {
        // Selvom vi fik et token, kunne vi ikke hente brugerinfo. Vi fortsætter uden email.
        console.warn("Kunne ikke hente brugerens email fra Google.");
    }

    const userData = await userInfoResponse.json();

    // 6. Send de nødvendige data tilbage til frontend.
    const responsePayload = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiry: Date.now() + (tokenData.expires_in * 1000),
      email: userData.email || 'Ukendt email',
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Generel fejlhåndtering
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});