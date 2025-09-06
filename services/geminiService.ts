import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import types needed for the new generateProfileDescription function
import type { UserTrait, Interest, PersonalityTag } from '../types';


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
        Based on the following user profile data, write a short, engaging, and friendly bio in first-person ("Jeg er...") for a social app. The bio should be in Danish.

        - Existing Bio: "${profile.bio}"
        - Personality Type: ${profile.personality_type}
        - Personality Traits (Big Five model, scores out of 100): ${traitsText}
        - Interests: ${interestsText}
        - Personality Tags: ${tagsText}

        Combine these elements into a natural-sounding paragraph. Focus on the positive aspects. Mention a few key interests and hint at their personality type without being too technical.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text.trim();
}
