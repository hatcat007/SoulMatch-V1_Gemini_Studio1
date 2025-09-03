import { GoogleGenAI, Type } from "@google/genai";
import type { User, Interest } from '../types';

// Lazily initialize the AI client to avoid accessing process.env on initial module load,
// which can interfere with other libraries' environment detection (like the AWS S3 SDK).
let ai: GoogleGenAI;
export function getAiClient() {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}


interface PersonalityTrait {
    trait: string;
    value: number; // 0-100
}

interface PersonalityAnalysisResult {
    personality_type: string; // e.g. "INFJ"
    traits: PersonalityTrait[];
}

export interface ImportedEventData {
    title: string;
    description: string;
    datetime: string | null;
    category: string | null;
    emoji: string | null;
    error?: string;
}

/**
 * Analyzes a user's profile data and test answers to generate a personality type and trait scores.
 * Streams the AI's thought process via a callback.
 * @param user - The user object containing bio and other details.
 * @param interests - A list of the user's interests.
 * @param testType - The depth of the analysis requested ('short' or 'long').
 * @param answers - The user's answers to the personality test questions.
 * @param onThinkingUpdate - Callback function to receive real-time updates from the AI's thought process.
 * @returns A structured personality analysis result.
 */
export async function analyzePersonality(
    user: User,
    interests: Interest[],
    testType: 'short' | 'long',
    answers: { question: string; answer: number }[],
    onThinkingUpdate: (update: string) => void
): Promise<PersonalityAnalysisResult> {
    const interestNames = interests.map(i => i.name).join(', ');
    const answersText = answers.map(a => `- Question: "${a.question}"\n  - Answer (0-100, 50 is neutral, 0 is strongly disagree, 100 is strongly agree): ${a.answer}`).join('\n');

    const prompt = `
        You are a sophisticated personality analysis AI for an app called SoulMatch. Your task is to analyze the provided user data and generate a personality profile.

        First, output your step-by-step reasoning for the personality analysis as plain text. Explain how you are weighing the user's bio, interests, and test answers. Think out loud, as if writing to a log.
        When your reasoning is complete, you MUST output a unique separator token on its own line: "||JSON_START||".
        After the separator, output a single, valid JSON object containing the final personality analysis. Do not add any text, markdown formatting, or explanations after the JSON object.

        User Data:
        - Bio: "${user.bio}"
        - Interests: ${interestNames}
        - Requested Test Type: ${testType}
        - Personality Test Answers:
        ${answersText}

        The final JSON object must have this exact structure: { "personality_type": "string", "traits": [{ "trait": "string", "value": number }] }.
        The traits to score (from 0 to 100) are: "Abstrakt opfattelse", "Emotionel tænkning", "Rationel tænkning", "Konkret opfattelse".
    `;

    try {
        const aiClient = getAiClient();
        const responseStream = await aiClient.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        let accumulatedResponse = "";
        let jsonString = "";
        let jsonStarted = false;
        const separator = "||JSON_START||";

        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (!chunkText) continue;

            if (jsonStarted) {
                jsonString += chunkText;
            } else {
                accumulatedResponse += chunkText;
                const separatorIndex = accumulatedResponse.indexOf(separator);

                if (separatorIndex !== -1) {
                    jsonStarted = true;
                    // The part of the chunk that was before the separator
                    const lastThinkingChunk = chunkText.split(separator)[0];
                    if (lastThinkingChunk) {
                        onThinkingUpdate(lastThinkingChunk);
                    }
                    // The part of the response that is after the separator
                    jsonString = accumulatedResponse.substring(separatorIndex + separator.length);
                } else {
                    onThinkingUpdate(chunkText); // Stream the thinking part as it comes.
                }
            }
        }
        
        if (!jsonString) {
             // Fallback in case the model doesn't follow instructions perfectly
            const separatorIndex = accumulatedResponse.indexOf(separator);
            if (separatorIndex !== -1) {
                jsonString = accumulatedResponse.substring(separatorIndex + separator.length);
            } else {
                throw new Error("AI did not return the expected JSON separator.");
            }
        }

        const result = JSON.parse(jsonString.trim());
        return result as PersonalityAnalysisResult;

    } catch (error) {
        console.error("Error fetching AI personality analysis:", error);
        throw error;
    }
}


/**
 * Generates a list of recommended user IDs based on a user's profile.
 * This is a conceptual example of how Gemini could power the matching feature.
 * @param currentUser - The user for whom to generate matches.
 * @param allUsers - A list of all potential users to match against.
 * @returns A list of user IDs sorted by match compatibility.
 */
export async function getAiMatches(currentUser: User, allUsers: User[]): Promise<number[]> {
  const prompt = `
    You are a sophisticated matchmaking AI for an app called SoulMatch, which aims to combat loneliness.
    Your task is to find the most compatible friends for a user based on their profile.
    
    Current User:
    - Name: ${currentUser.name}
    - Age: ${currentUser.age}
    
    Potential Matches (List of user profiles):
    ${allUsers
      .filter(u => u.id !== currentUser.id)
      .map(u => `- ID: ${u.id}, Name: ${u.name}, Age: ${u.age}`)
      .join('\n')}
      
    Based on the principles of forming strong, supportive friendships, analyze the list and return a JSON array
    of user IDs, ordered from the most compatible to the least. Only return the IDs.
    
    Example Output: [3, 1, 5, 2, 4]
  `;

  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'INTEGER',
          },
        },
      },
    });
    
    const textResponse = response.text.trim();
    const matches = JSON.parse(textResponse);
    return matches as number[];
  } catch (error) {
    console.error("Error fetching AI matches:", error);
    // Fallback to random matches on API error, as per error handling guidelines.
    return allUsers.filter(u => u.id !== currentUser.id).map(u => u.id).sort(() => 0.5 - Math.random()).slice(0, 5);
  }
}

/**
 * Extracts structured event data from a block of text using AI.
 * @param eventText - The raw text content copied from an event page.
 * @param categoryOptions - A list of valid categories for the AI to choose from.
 * @param emojiOptions - A list of valid emojis for the AI to choose from.
 * @param emojiLevel - The desired level of emoji usage in the description.
 * @returns A structured object with the event details.
 */
export async function importEventFromText(
    eventText: string,
    categoryOptions: string[],
    emojiOptions: string[],
    emojiLevel: 'ai' | 'none' | 'some' | 'many'
): Promise<ImportedEventData> {
    let emojiInstruction = '';
    switch (emojiLevel) {
        case 'none':
            emojiInstruction = 'Do not use any emojis in the description.';
            break;
        case 'some':
            emojiInstruction = 'Use a few emojis where appropriate in the description to seem friendly.';
            break;
        case 'many':
            emojiInstruction = 'Use emojis generously in the description to make the text lively and expressive.';
            break;
        case 'ai':
        default:
            emojiInstruction = 'You can use emojis in the description if you feel it enhances the message.';
            break;
    }

    const prompt = `
        You are an intelligent assistant that extracts structured data from raw text.
        Analyze the following text copied from an event page:

        --- START OF PASTED TEXT ---
        ${eventText}
        --- END OF PASTED TEXT ---

        Your task is to extract the following information:
        1.  **title**: The official title of the event.
        2.  **description**: The full, detailed description of the event. Format this description using simple markdown (like **bold text** for emphasis, bullet points starting with a hyphen for lists, and natural paragraph breaks with double newlines). ${emojiInstruction} Try to find the event's location/address and include it.
        3.  **datetime**: The specific starting date and time of the event. Format this as a valid string for an HTML datetime-local input (e.g., "2024-09-21T19:00"). If the text describes a recurring event without a specific date (e.g., "Every Thursday"), return null for this field. You may add a note about the recurring nature in the description.
        4.  **category**: The most appropriate category for the event. Choose ONE from this list: [${categoryOptions.join(', ')}]. If no suitable category is found, return null.
        5.  **emoji**: The most fitting emoji icon for the event. Choose ONE from this list: [${emojiOptions.join(', ')}]. If none fit well, return null.

        Return this information as a single, valid JSON object.
        If you cannot find a title or description, return a JSON object with an "error" key explaining the problem.
    `;

    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        datetime: { type: Type.STRING, nullable: true },
                        category: { type: Type.STRING, nullable: true },
                        emoji: { type: Type.STRING, nullable: true },
                        error: { type: Type.STRING, nullable: true },
                    },
                },
            },
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return result as ImportedEventData;

    } catch (error) {
        console.error("Error importing event data from AI:", error);
        throw new Error("AI analysis failed. Please check the provided text or try again later.");
    }
}


/**
 * Generates an event image based on a description using AI.
 * @param description - The event description.
 * @param style - The desired image style: 'realistic' or 'illustration'.
 * @param title - The event title, to be optionally included on the image.
 * @param includeTitle - Boolean flag to determine if the title should be on the image.
 * @returns A base64 encoded string of the generated JPEG image.
 */
export async function generateEventImageFromText(
    description: string,
    style: 'realistic' | 'illustration',
    title: string | null,
    includeTitle: boolean
): Promise<string> {
    let prompt = '';
    const titleInstruction = includeTitle && title
        ? `Elegantly and clearly overlay the following title on the image using a suitable font and placement: "${title}"`
        : 'Do not add any text overlays to the image.';

    if (style === 'realistic') {
        prompt = `
            Generate an ultra-realistic, high-quality, photorealistic image that visually represents the following event description. The image should be suitable for a social event promotion. Focus on capturing the mood and key elements described.

            Event Description: "${description}"

            Style guidelines:
            - Aspect Ratio: 16:9
            - Mood: Welcoming, friendly, and social.
            - Text: ${titleInstruction}
        `;
    } else { // style === 'illustration'
        prompt = `
            Create a beautiful 2D illustration that captures the essence and emotion of the following event description. The style should be elegant, modern, and visually appealing, suitable for a social event promotion. The color palette and overall mood of the illustration must align perfectly with the feelings and theme conveyed in the text (e.g., joyful, calm, energetic, cozy).

            Event Description: "${description}"

            Style guidelines:
            - Aspect Ratio: 16:9
            - Style: High-quality, detailed 2D illustration.
            - Emotion and Color: The colors and artistic style must match the event's described atmosphere.
            - Text: ${titleInstruction}
        `;
    }

    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error("AI did not generate an image.");
        }
    } catch (error) {
        console.error("Error generating event image:", error);
        throw new Error("AI image generation failed.");
    }
}