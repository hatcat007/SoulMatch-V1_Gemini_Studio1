// Vercel Edge Functions provide a Request-like and Response-like API.
// We need to import the types to ensure we're using them correctly.
// This is a simplified setup for Vercel, assuming a NodeJS runtime.
// If you are using Edge runtime, the imports would be slightly different.

import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI, Type } from "@google/genai";

// Define expected request and response data structures
interface RequestData {
    description: string;
    existingActivities: { name: string }[];
    existingInterests: { name: string }[];
    interestCategories: { name: string }[];
}

interface ResponseData {
    suggested_activities?: string[];
    suggested_interests?: { name: string; category_name: string }[];
    error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { 
        description, 
        existingActivities, 
        existingInterests, 
        interestCategories 
    }: RequestData = req.body;

    // IMPORTANT: Get the API key from Vercel's environment variables
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY is not set in Vercel environment variables.");
        return res.status(500).json({ error: "Server configuration error: Missing API Key." });
    }

    const ai = new GoogleGenAI({ apiKey });

    const existingActivityNames = existingActivities.map(a => a.name.toLowerCase());
    const existingInterestNames = existingInterests.map(i => i.name.toLowerCase());
    const interestCategoryNames = interestCategories.map(c => c.name);

    const systemInstruction = `Du er en ekspert i at kategorisere organisationer. Din opgave er at læse en organisationsbeskrivelse og foreslå nye, relevante "aktiviteter" og "interesser" som tags.
- Du MÅ IKKE foreslå tags, der allerede findes på de medfølgende lister over eksisterende tags.
- Foreslå kun specifikke, håndgribelige aktiviteter og interesser.
- For hver "interesse" du foreslår, SKAL du vælge den mest passende kategori fra listen: ${interestCategoryNames.join(', ')}.
- Svaret skal være i JSON format og følge det angivne skema. Returner tomme arrays hvis ingen nye tags kan findes.`;

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
                        items: { type: Type.STRING },
                        description: "En liste af nye, relevante aktivitets-tags."
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
                        description: "En liste af nye interesse-tags med deres kategori."
                    }
                }
            }
        }
    });
    
    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText);
    
    return res.status(200).json(data);

  } catch (error) {
    console.error("Error in /api/suggest-tags-ai:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: errorMessage });
  }
}
