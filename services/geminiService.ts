import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import types needed for the new generateProfileDescription function
import type { Interest, PersonalityTag, UserTrait } from '../types';


let aiClient: GoogleGenAI;

/**
 * Initializes and returns a singleton instance of the GoogleGenAI client.
 * Throws an error if the API_KEY is not available in the environment.
 */
export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!process.env.API_KEY) {
      // As per guidelines, this should be pre-configured. Throw an error if it's not available.
      throw new Error("API_KEY environment variable not set. Please ensure it is configured in your environment.");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
};

/**
 * Uses a multimodal Gemini model to extract structured event data from text and/or images.
 */
export async function importEventFromMultimodal(
    text: string,
    files: { mimeType: string; data: string }[],
    categoryOptions: string[],
    emojiOptions: string[],
    emojiLevel: 'ai' | 'none' | 'some' | 'many'
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
    
    const systemInstruction = `You are an expert event creator. Your task is to extract event details from the provided text and images. Be concise and accurate. Today is ${new Date().toISOString()}.
    The response must be in JSON format. The JSON schema is provided. 
    The "category" must be one of the following values: ${categoryOptions.join(', ')}.
    The "emoji" must be one of the following values: ${emojiOptions.join(', ')}.
    ${emojiInstruction}
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
                    description: { type: Type.STRING, description: 'A detailed description of the event.' },
                    datetime: { type: Type.STRING, description: 'The start date and time of the event in ISO 8601 format. This is required.' },
                    end_time: { type: Type.STRING, description: 'The optional end date and time of the event in ISO 8601 format.' },
                    address: { type: Type.STRING, description: 'The full address of the event location.' },
                    category: { type: Type.STRING, description: `The category of the event. Must be one of: ${categoryOptions.join(', ')}` },
                    emoji: { type: Type.STRING, description: `An emoji for the event. Must be one of: ${emojiOptions.join(', ')}` },
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
  scores: {
    Openness: number;
    Conscientiousness: number;
    Extraversion: number;
    Agreeableness: number;
    Neuroticism: number;
  };
  personality_type: { code: string; title: string };
}> {
  const ai = getAiClient();
  const systemInstruction = `Du er en ekspert i personlighedsanalyse baseret på Big Five-modellen (Åbenhed, Samvittighedsfuldhed, Ekstroversion, Venlighed, Neuroticisme).
  Analysér brugerens svar, bio, interesser og tags. Beregn en score for hver af de fem dimensioner på en skala fra 0-100.
  Baseret på disse scores skal du også bestemme den mest passende personlighedstype ud fra den vedlagte liste over 16 typer.
  Dit svar SKAL være i JSON-format og følge det angivne skema. Vær objektiv og baser din analyse udelukkende på de angivne data.
  
  De 16 personlighedstyper er:
  - ISTJ – “Inspektøren”
  - ISFJ – “Omsorgsgiveren”
  - INFJ – “Rådgiveren”
  - INTJ – “Strategen”
  - ISTP – “Håndværkeren”
  - ISFP – “Kunstneren”
  - INFP – “Idealisten”
  - INTP – “Tænkeren”
  - ESTP – “Entreprenøren”
  - ESFP – “Performeren”
  - ENFP – “Inspiratoren”
  - ENTP – “Opfinderen”
  - ESTJ – “Lederen”
  - ESFJ – “Plejeren”
  - ENFJ – “Læreren”
  - ENTJ – “Kommandøren”
  `;
  
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
                scores: {
                    type: Type.OBJECT,
                    properties: {
                        Openness: { type: Type.NUMBER, description: "Score for Åbenhed (0-100)"},
                        Conscientiousness: { type: Type.NUMBER, description: "Score for Samvittighedsfuldhed (0-100)"},
                        Extraversion: { type: Type.NUMBER, description: "Score for Ekstroversion (0-100)"},
                        Agreeableness: { type: Type.NUMBER, description: "Score for Venlighed (0-100)"},
                        Neuroticism: { type: Type.NUMBER, description: "Score for Neuroticisme (0-100)"},
                    },
                },
                personality_type: {
                    type: Type.OBJECT,
                    properties: {
                        code: { type: Type.STRING, description: "Den 4-bogstavs personlighedskode (f.eks. 'INFJ')" },
                        title: { type: Type.STRING, description: "Den fulde titel (f.eks. 'INFJ – “Rådgiveren”')" }
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
    traits: UserTrait[];
    interests: Interest[];
    tags: PersonalityTag[];
}): Promise<string> {
    const ai = getAiClient();

    const traitsText = profile.traits.map(t => `${t.trait}: ${t.value}%`).join(', ');
    const interestsText = profile.interests.map(i => i.name).join(', ');
    const tagsText = profile.tags.map(t => t.name).join(', ');

    const prompt = `
        Baseret på følgende brugerprofildata, skriv en kort, engagerende og venlig biografi i første person ("Jeg er...") til en social app. Biografien skal være på dansk.

        - Eksisterende Bio: "${profile.bio}"
        - Personlighedstype: ${profile.personality_type}
        - Personlighedstræk (Big Five-model, scores ud af 100): ${traitsText}
        - Interesser: ${interestsText}
        - Personlighedstags: ${tagsText}

        Kombiner disse elementer til et naturligt klingende afsnit. Fokuser på de positive aspekter. Nævn et par nøgleinteresser og antyd deres personlighedstype uden at være for teknisk.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text.trim();
}