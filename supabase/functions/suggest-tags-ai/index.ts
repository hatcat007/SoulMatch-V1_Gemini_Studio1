// File: supabase/functions/suggest-tags-ai/index.ts

// This reference enables Supabase Edge Function types and Deno globals.
// FIX: The type reference URL was invalid. Updated to a canonical, versioned esm.sh URL to resolve TypeScript errors related to Deno types.
/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// Use esm.sh for better compatibility in the Supabase Edge Function runtime.
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@1.16.0";

// Define interfaces to match the frontend types
interface Activity { id: number; name: string; icon: string; }
interface Interest { id: number; name: string; category_id: number; }
interface InterestCategory { id: number; name: string; }

// Add CORS headers to allow requests from your app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or your specific app domain for better security
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Explicitly allow POST
}

const iconNames = ['Utensils', 'Dice5', 'MessagesSquare', 'Music', 'Paintbrush', 'Footprints', 'Bike', 'PartyPopper', 'Presentation', 'Wrench', 'Film', 'TreePine', 'PenTool', 'Camera', 'FileText', 'Heart', 'Gem', 'Ship', 'Laptop', 'Scissors', 'Droplets', 'Flower', 'Hammer', 'Book', 'BookOpen', 'Circle', 'Dumbbell', 'Flower2', 'Mountain', 'PersonStanding', 'Swords', 'Sailboat', 'Waves', 'Snowflake', 'Flag', 'PawPrint', 'Gamepad2', 'Code', 'ToyBrick', 'Smartphone', 'Twitch', 'Trophy', 'Gamepad', 'Puzzle', 'Coffee', 'GlassWater', 'Beer', 'Cake', 'Leaf', 'Globe', 'Flame', 'Users', 'Backpack', 'Tent', 'Building2', 'Car', 'MapPin', 'Bird', 'Sprout', 'Fish', 'Star', 'HelpCircle', 'Store', 'Landmark', 'Megaphone', 'Baby', 'Languages', 'Guitar', 'Mic', 'Disc', 'Palette', 'Scroll', 'Theater', 'Construction', 'MoveVertical'];


serve(async (req) => {
  // Handle CORS preflight requests for browser-based calls
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { description, existingActivities, existingInterests, interestCategories } = await req.json();
    
    // IMPORTANT: Get the API key from the function's environment variables
    const apiKey = Deno.env.get('API_KEY');
    if (!apiKey) {
      throw new Error("Missing API_KEY in function environment variables.");
    }
    
    const ai = new GoogleGenAI({ apiKey });

    // Add fallbacks to empty arrays to prevent .map of undefined error if the properties are missing from the request.
    const existingActivityNames = (existingActivities as Activity[] || []).map(a => a.name.toLowerCase());
    const existingInterestNames = (existingInterests as Interest[] || []).map(i => i.name.toLowerCase());
    const interestCategoryNames = (interestCategories as InterestCategory[] || []).map(c => c.name);

    const systemInstruction = `Du er en kreativ og hjælpsom assistent, der er ekspert i at forstå danske organisationer og foreninger. Din opgave er at brainstorme nye, relevante "aktiviteter" og "interesser" baseret på en organisationsbeskrivelse.

VIGTIGE REGLER:
1.  **Minimum Antal:** Du SKAL foreslå MINDST 4 nye aktiviteter OG MINDST 4 nye interesser. Tænk kreativt og "outside the box" for at nå dette mål.
2.  **Ikonvalg:** For HVER "aktivitet" du foreslår, SKAL du vælge det mest passende ikonnavn fra denne liste: ${iconNames.join(', ')}. Ikonnavnet skal være et eksakt match fra listen.
3.  **Undgå Duplikater:** Du MÅ IKKE foreslå tags, der allerede findes på listerne over eksisterende tags.
4.  **Relevans:** Alle forslag skal være relevante for organisationens beskrivelse.
5.  **Kategorisering:** For HVER "interesse" du foreslår, SKAL du vælge den mest passende kategori fra denne liste: ${interestCategoryNames.join(', ')}.
6.  **Format:** Svaret SKAL være i JSON-format og følge det angivne skema. Kun hvis det er absolut umuligt at finde 4 relevante forslag, må du returnere færre - men prøv ihærdigt at nå målet.`;

    const prompt = `
        Organisationsbeskrivelse: "${description}"
        Eksisterende aktiviteter (undgå disse): ${JSON.stringify(existingActivityNames)}
        Eksisterende interesser (undgå disse): ${JSON.stringify(existingInterestNames)}
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggested_activities: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "Navnet på den nye aktivitet." },
                                icon: { type: Type.STRING, description: `Et passende ikonnavn fra den angivne liste. SKAL være et eksakt match.` }
                            }
                        },
                        description: "En liste af mindst 4 nye, relevante aktivitets-tags med deres ikon."
                    },
                    suggested_interests: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "Navnet på den nye interesse." },
                                category_name: { type: Type.STRING, description: `Kategorien for interessen. SKAL være en fra listen: ${interestCategoryNames.join(', ')}` }
                            }
                        },
                        description: "En liste af mindst 4 nye interesse-tags med deres kategori."
                    }
                }
            }
        }
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error("Error in suggest-tags-ai function:", error);

    let errorMessage = error.message;
    // Check for the specific API key referrer error from Google Cloud
    if (typeof errorMessage === 'string' && errorMessage.includes("API_KEY_HTTP_REFERRER_BLOCKED")) {
      errorMessage = "Google API Key Error: The API key is restricted by HTTP referrer. Server-side requests (like this one) do not have a referrer and are being blocked. To fix this, go to your Google Cloud Console -> APIs & Services -> Credentials, edit the key, and change the restriction from 'HTTP referrers' to 'None'. This is secure because the key is only used on the server.";
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})