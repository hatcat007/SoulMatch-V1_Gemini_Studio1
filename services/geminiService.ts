import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from './supabase'; // Ensure supabase client is exported from supabase.ts
// FIX: Import types needed for the new generateProfileDescription function
import type { Activity, Interest, InterestCategory, PersonalityTag, UserPersonalityDimension } from '../types';


let aiClient: GoogleGenAI;

/**
 * Initializes and returns a singleton instance of the GoogleGenAI client.
 * NOTE: This function is intended for client-side operations where the API key might
 * not be available or secure. It will default to a dummy key to prevent crashes.
 * For secure operations, always use a server-side endpoint (like a Vercel function).
 */
export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    // Client-side code CANNOT securely access process.env.API_KEY.
    // We check for it, but default to a non-functional key to avoid crashing the app.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API_KEY environment variable not available on the client. Client-side AI features will not work. This is expected and secure. Use server-side functions for AI calls.");
      aiClient = new GoogleGenAI({ apiKey: "CLIENT_KEY_IS_NOT_AVAILABLE" });
    } else {
        // This path is unlikely to be hit in a production build but is here for completeness.
        aiClient = new GoogleGenAI({ apiKey: apiKey });
    }
  }
  return aiClient;
}

/**
 * Type definition for the data structure returned by the AI when importing an event.
 */
export type ImportedEventData = {
    title: string;
    description: string;
    datetime: string;
    end_time?: string;
    address: string;
    category: string;
    emoji: string;
    error?: string;
    datetime_options?: string[];
    suggested_activity_names?: string[];
    suggested_interest_names?: string[];
    is_sponsored?: boolean;
    offer?: string;
    is_diagnosis_friendly?: boolean;
};

/**
 * Uses a multimodal Gemini model to extract structured event data from text and/or images.
 */
export async function importEventFromMultimodal(
    text: string,
    files: { mimeType: string; data: string }[],
    categoryOptions: string[],
    emojiOptions: string[],
    emojiLevel: 'ai' | 'none' | 'some' | 'many',
    allActivities: Activity[],
    allInterests: Interest[],
    descriptionBehavior: 'improve' | 'format_only'
): Promise<ImportedEventData> {
    const ai = getAiClient();
    const contents: any[] = [];
    if (text) {
        contents.push({ text });
    }
    files.forEach(file => {
        contents.push({
            inlineData: {
                mimeType: file.mimeType,
                data: file.data,
            }
        });
    });

    let emojiInstruction = '';
    switch (emojiLevel) {
        case 'none': emojiInstruction = 'Do not add any emojis to the description.'; break;
        case 'some': emojiInstruction = 'Add a few relevant emojis to the description to make it friendly.'; break;

        case 'many': emojiInstruction = 'Add many relevant emojis to the description to make it lively and expressive.'; break;
        default: emojiInstruction = 'You can add emojis to the description if you feel it enhances the message.'; break;
    }
    
    let descriptionInstruction = '';
    if (descriptionBehavior === 'improve') {
        descriptionInstruction = `**Description Field Rules:**
- Rewrite and improve the user's provided text to create a clear, engaging, and friendly event description.
- The final description MUST be formatted in clean, readable Markdown. Use paragraphs for spacing, bullet points for lists (using hyphens), and **bold** for important details.`;
    } else { // 'format_only'
        descriptionInstruction = `**Description Field Rules:**
- Take the user's provided text for the description and format it into clean, readable Markdown.
- **DO NOT change the content, wording, or meaning.** The original text must be preserved.
- Your only task is to add structure: use paragraphs for spacing, bullet points for lists (using hyphens), and make key phrases **bold**.`;
    }

    const activityNames = allActivities.map(a => a.name);
    const interestNames = allInterests.map(i => i.name);

    const systemInstruction = `You are an expert event creator. Your task is to extract event details from the provided text and images. Be concise and accurate. Today is ${new Date().toISOString()}.
    The response must be in JSON format. The JSON schema is provided.
    **Title Field Rules:**
    - The "title" is the most important field. You MUST extract the correct and official name of the event from the provided text or images.
    - If no explicit title is found, create a short, descriptive, and appealing title based on the event's main activity. For example, if the text is about a "workshop where we will make collages", a good title would be "Kreativt Kollageværksted".
    ${descriptionInstruction}
    ${emojiInstruction}
    The "category" must be one of the following values: ${categoryOptions.join(', ')}.
    The "emoji" must be one of the following values: ${emojiOptions.join(', ')}.
    Based on the event's title and description, select the most relevant activities from this list: ${activityNames.join(', ')}.
    Also, select the most relevant interests from this list: ${interestNames.join(', ')}.
    Do not invent new activities or interests; only use the ones provided.
    If the event mentions sponsors, a special deal, or free items, set 'is_sponsored' to true and extract the deal text into the 'offer' field.
    Analyze the text for clues about accessibility or being diagnosis-friendly (e.g., mentions of quiet spaces, sensory considerations, small groups). If found, set 'is_diagnosis_friendly' to true.
    If there are multiple possible dates/times, list them in the 'datetime_options' array. Otherwise, put the single best date/time in 'datetime' and leave 'datetime_options' empty.
    If you cannot find a required field, provide a sensible empty value, but set an 'error' field with a description of what is missing.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: contents },
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: 'The title of the event.' },
                    description: { type: Type.STRING, description: 'A detailed description of the event, formatted in Markdown.' },
                    datetime: { type: Type.STRING, description: 'The start date and time of the event in ISO 8601 format. This is required.' },
                    end_time: { type: Type.STRING, description: 'The optional end date and time of the event in ISO 8601 format.' },
                    address: { type: Type.STRING, description: 'The full address of the event location.' },
                    category: { type: Type.STRING, description: `The category of the event. Must be one of: ${categoryOptions.join(', ')}` },
                    emoji: { type: Type.STRING, description: `An emoji for the event. Must be one of: ${emojiOptions.join(', ')}` },
                    suggested_activity_names: { type: Type.ARRAY, items: { type: Type.STRING }, description: `A list of relevant activity names from the provided list.` },
                    suggested_interest_names: { type: Type.ARRAY, items: { type: Type.STRING }, description: `A list of relevant interest names from the provided list.` },
                    is_sponsored: { type: Type.BOOLEAN, description: 'True if the event is sponsored or offers a special deal.' },
                    offer: { type: Type.STRING, description: 'The text of the sponsorship deal or offer, if any.' },
                    is_diagnosis_friendly: { type: Type.BOOLEAN, description: 'True if the event is described as being diagnosis-friendly or having similar considerations.' },
                    error: { type: Type.STRING, description: 'An error message if any required information is missing.' },
                    datetime_options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of possible date/time options if ambiguous.' },
                },
            },
        },
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ImportedEventData;
    } catch (e) {
        console.error("Failed to parse Gemini response:", response.text);
        throw new Error("Could not parse event data from AI response.");
    }
}

/**
 * Generates images for a social event based on its title and description.
 */
export async function generateEventImageFromText(
    description: string,
    style: 'realistic' | 'illustration',
    title: string,
    includeTitle: boolean,
    numberOfImages: number
): Promise<string[]> {
    const ai = getAiClient();
    const prompt = `Generate a compelling image for a social event.
    Event Title: "${title}"
    Event Description: "${description}"
    Style: ${style}. ${style === 'realistic' ? 'A photorealistic image' : 'A vibrant and friendly illustration'}.
    ${includeTitle ? `The image should visually incorporate the text "${title}" in an artistic and legible way.` : 'Do not include any text in the image.'}
    The image should be inviting and represent the theme of the event.
    Focus on human connection, positive emotions, and the activity described.
    Avoid generic stock photo styles.`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        },
    });
    
    return response.generatedImages.map(img => img.image.imageBytes);
}

/**
 * Generates images for a social meeting place based on its name and description.
 */
export async function generatePlaceImageFromText(
    description: string,
    name: string,
    style: 'realistic' | 'illustration',
    numberOfImages: number
): Promise<string[]> {
    const ai = getAiClient();
    const prompt = `Generate an inviting image for a social meeting place.
    Place Name: "${name}"
    Place Description: "${description}"
    Style: ${style}. ${style === 'realistic' ? 'A photorealistic image showing the exterior or a cozy interior of the place' : 'A vibrant and friendly illustration of the place'}.
    The image should make people want to visit. Focus on atmosphere, ambiance, and the type of activity it's good for (e.g., coffee, games, etc.).
    Do not include any text in the image.`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
        },
    });
    
    return response.generatedImages.map(img => img.image.imageBytes);
}

export async function analyzePersonality(data: {
  answers: { question: string; answer: number; dimension: string, reversed: boolean }[];
  bio: string;
  interests: { name: string }[];
  tags: { name: string }[];
}): Promise<{
  type_code: string;
  dimensions: {
    dimension: 'EI' | 'SN' | 'TF' | 'JP';
    dominant_trait: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
    score: number;
    description: string;
  }[];
}> {
  const ai = getAiClient();
  const systemInstruction = `Du er en ekspert i personlighedsanalyse baseret på en model inspireret af Myers-Briggs (MBTI). Du skal analysere brugerens svar, bio, interesser og tags for at score dem på fire dimensioner:
- E/I (Ekstrovert/Introvert): Hvordan brugeren får energi.
- S/N (Sansning/Intuition): Hvordan brugeren tager information ind.
- T/F (Tænkning/Følen): Hvordan brugeren træffer beslutninger.
- J/P (Vurderende/Opfattende): Hvordan brugeren strukturerer sit liv.

For hver dimension skal du:
1. Bestemme det dominerende træk (f.eks. 'I' for Introvert).
2. Beregne en score (0-100) for det dominerende træk. En score på 70 for 'I' betyder 70% Introvert og 30% Ekstrovert.
3. Skrive en kort, personlig og indsigtsfuld beskrivelse (på dansk, i "Du er..." format) der forklarer, hvad denne balance betyder for brugeren. Inddrag gerne hints fra deres bio og interesser for at gøre beskrivelsen mere personlig.
4. Sammensæt de fire dominerende træk til en 4-bogstavs personlighedskode (f.eks. 'INFP').

Svaret SKAL være i JSON-format og følge det angivne skema.`;
  
  const prompt = `
    Brugerdata:
    - Svar på spørgeskema: ${JSON.stringify(data.answers)}
    - Bio: "${data.bio}"
    - Interesser: ${data.interests.map(i => i.name).join(', ')}
    - Personlighedstags: ${data.tags.map(t => t.name).join(', ')}
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
                type_code: { type: Type.STRING, description: "Den 4-bogstavs personlighedskode (f.eks. 'INFP')." },
                dimensions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                             dimension: { type: Type.STRING, description: "Dimensionen, f.eks. 'EI', 'SN', 'TF', 'JP'." },
                             dominant_trait: { type: Type.STRING, description: "Det dominerende træk, f.eks. 'E', 'I', 'S', 'N', 'T', 'F', 'J', 'P'." },
                             score: { type: Type.NUMBER, description: "Scoren (0-100) for det dominerende træk." },
                             description: { type: Type.STRING, description: "En kort, personlig beskrivelse af brugerens balance på denne dimension." }
                        }
                    }
                }
            }
        }
    }
  });
  
  try {
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Failed to parse personality analysis response:", response.text);
    throw new Error("Kunne ikke analysere personlighedsdata.");
  }
}


/**
 * Generates a descriptive profile summary using AI based on user data.
 */
export async function generateProfileDescription(profile: {
    bio: string;
    personality_type: string;
    dimensions: UserPersonalityDimension[];
    interests: Interest[];
    tags: PersonalityTag[];
}): Promise<string> {
    const ai = getAiClient();

    const dimensionsText = profile.dimensions.map(d => `${d.dominant_trait}: ${d.score}% - ${d.description}`).join('\n');
    const interestsText = profile.interests.map(i => i.name).join(', ');
    const tagsText = profile.tags.map(t => t.name).join(', ');

    const prompt = `
        Baseret på følgende brugerprofildata, skriv en kort, engagerende og venlig biografi i første person ("Jeg er...") til en social app. Biografien skal være på dansk.

        - Eksisterende Bio: "${profile.bio}"
        - Personlighedstype: ${profile.personality_type}
        - Personlighedsdimensioner: 
        ${dimensionsText}
        - Interesser: ${interestsText}
        - Personlighedstags: ${tagsText}

        Kombiner disse elementer til et naturligt klingende afsnit på 3-4 sætninger. Fokuser på de positive aspekter. Nævn et par nøgleinteresser og flet elegant personlighedsbeskrivelserne ind uden at være for teknisk. Målet er en tekst, der lyder som noget, personen selv kunne have skrevet.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text.trim();
}

/**
 * Suggests new activities and interests based on an organization's description by calling a secure Supabase Edge Function.
 */
export async function suggestTagsFromDescription(
    description: string,
    existingActivities: Activity[],
    existingInterests: Interest[],
    interestCategories: InterestCategory[]
): Promise<{
    suggested_activities: { name: string; icon: string }[];
    suggested_interests: { name: string; category_name: string }[];
}> {
    try {
        const { data, error } = await supabase.functions.invoke('suggest-tags-ai', {
            body: { description, existingActivities, existingInterests, interestCategories },
        });

        if (error) {
            if (error.context && typeof error.context.error === 'string') {
                 throw new Error(error.context.error);
            }
            throw new Error(error.message || 'Unknown error from AI function.');
        }

        const activitiesFromAI: { name: string; icon: string }[] = (Array.isArray(data.suggested_activities) ? data.suggested_activities : [])
            .filter((activity: any): activity is { name: string; icon: string } => 
                activity && typeof activity.name === 'string' && typeof activity.icon === 'string'
            );
        const existingActivityNames = existingActivities.map(a => a.name.toLowerCase());
        const uniqueActivities = activitiesFromAI.filter(activity => !existingActivityNames.includes(activity.name.toLowerCase()));


        const interestCategoryNames = interestCategories.map(c => c.name);
        const interestsFromAI: { name: string; category_name: string }[] = (Array.isArray(data.suggested_interests) ? data.suggested_interests : [])
            .filter((interest: any): interest is { name: string; category_name: string } => 
                interest && typeof interest.name === 'string' && typeof interest.category_name === 'string'
            );
        const existingInterestNames = existingInterests.map(i => i.name.toLowerCase());
        const uniqueInterests = interestsFromAI.filter((interest: { name: string; category_name: string }) => 
            !existingInterestNames.includes(interest.name.toLowerCase()) && interestCategoryNames.includes(interest.category_name)
        );
        
        return {
            suggested_activities: uniqueActivities,
            suggested_interests: uniqueInterests,
        };

    } catch (e) {
        console.error("Failed to invoke Supabase function 'suggest-tags-ai':", e);
        throw new Error(`Fejl ved AI-forslag: ${e instanceof Error ? e.message : String(e)}`);
    }
}