
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
    end_time: string | null;
    address: string | null;
    datetime_options?: string[];
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
    return allUsers.map(u => u.id).sort(() => 0.5 - Math.random());
  }
}

export async function generateEventImageFromText(
    description: string,
    style: 'realistic' | 'illustration',
    title?: string,
    includeTitle?: boolean,
    numberOfImages: number = 1
): Promise<string[]> {
    const aiClient = getAiClient();
    const prompt = `
        Generate a compelling, high-quality image for a social event.
        Event Title: "${title || 'Untitled Event'}"
        Description: "${description}"
        Style: ${style}.
        ${includeTitle ? 'Subtly and artfully incorporate the event title text into the image.' : 'Do not include any text in the image.'}
        The image should be visually appealing, relevant to the event, and inviting. It must be suitable for all audiences. Focus on themes of community, friendship, and positive social interaction.
    `;

    try {
        const response = await aiClient.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            }
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("AI did not return any images.");
        }
        return response.generatedImages.map(img => img.image.imageBytes);

    } catch (error) {
        console.error("Error generating event image from AI:", error);
        throw new Error(`AI image generation failed. The prompt might have been blocked for safety reasons. Please try a different description. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// FIX: Added the missing `generatePlaceImageFromText` function. This function is similar to `generateEventImageFromText` but with a prompt tailored for generating images of social meeting places.
export async function generatePlaceImageFromText(
    description: string,
    placeName: string,
    style: 'realistic' | 'illustration',
    numberOfImages: number = 1
): Promise<string[]> {
    const aiClient = getAiClient();
    const prompt = `
        Generate a compelling, high-quality image for a social meeting place.
        Place Name: "${placeName}"
        Description: "${description}"
        Style: ${style}.
        Do not include any text in the image.
        The image should be visually appealing, relevant to the place, and inviting. It must be suitable for all audiences. Focus on creating a welcoming and cozy atmosphere where people can connect. Think about themes of community, friendship, and positive social interaction.
    `;

    try {
        const response = await aiClient.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            }
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("AI did not return any images.");
        }
        return response.generatedImages.map(img => img.image.imageBytes);

    } catch (error) {
        console.error("Error generating place image from AI:", error);
        throw new Error(`AI image generation failed. The prompt might have been blocked for safety reasons. Please try a different description. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function importEventFromMultimodal(
    text: string,
    files: { mimeType: string; data: string }[],
    categoryOptions: string[],
    emojiOptions: string[],
    emojiLevel: 'ai' | 'none' | 'some' | 'many'
): Promise<ImportedEventData> {
    const aiClient = getAiClient();

    const textPart = {
        text: `
            Analyze the following event information from text and/or images/PDFs. Your task is to extract the event details into a structured JSON format.

            Event Text:
            ---
            ${text || '(No text provided)'}
            ---

            Rules:
            1.  **Extract Core Details**: Identify the event's title, a detailed description, the full start date and time (datetime), the end date and time (end_time) if specified, and the full address.
            2.  **Categorize**: From the list of available categories, choose the SINGLE most appropriate one. Category List: [${categoryOptions.join(', ')}].
            3.  **Select Emoji**: From the list of available emojis, choose ONE that best represents the event's mood or theme. Emoji List: [${emojiOptions.join(', ')}]. The level of emoji usage in the description should be: ${emojiLevel}.
            4.  **Handle Ambiguity**: If you find multiple possible start dates/times, list them in the 'datetime_options' array. Otherwise, this should be null.
            5.  **Format Output**: The output MUST be a single, valid JSON object matching the provided schema. Do not include any text, explanations, or markdown formatting before or after the JSON.
            6.  **Timezone**: Assume the timezone is Europe/Copenhagen unless otherwise specified. Format datetime and end_time as ISO 8601 strings (e.g., 'YYYY-MM-DDTHH:mm'). If no year is specified, assume the current year.
            7.  **Address**: The address should be a complete, single-line string including street, number, city, and postal code if available.
        `
    };

    const fileParts = files.map(file => ({
        inlineData: {
            mimeType: file.mimeType,
            data: file.data,
        },
    }));

    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, ...fileParts] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: 'The official title of the event.' },
                        description: { type: Type.STRING, description: 'A detailed description of the event.' },
                        datetime: { type: Type.STRING, description: 'The start date and time in ISO 8601 format. Null if multiple options exist.', nullable: true },
                        end_time: { type: Type.STRING, description: 'The end date and time in ISO 8601 format. Null if not specified.', nullable: true },
                        address: { type: Type.STRING, description: 'The full street address of the event location.', nullable: true },
                        datetime_options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'An array of possible start datetimes if the input is ambiguous.',
                            nullable: true
                        },
                        category: { type: Type.STRING, description: `The most fitting category from the provided list: [${categoryOptions.join(', ')}]`, nullable: true },
                        emoji: { type: Type.STRING, description: `The most fitting emoji from the provided list: [${emojiOptions.join(', ')}]`, nullable: true },
                        error: { type: Type.STRING, description: 'If analysis fails, provide a brief error reason here.', nullable: true },
                    },
                    required: ['title', 'description', 'datetime', 'end_time', 'address', 'category', 'emoji'],
                }
            }
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        
        if (result.datetime === "null") result.datetime = null;
        if (result.end_time === "null") result.end_time = null;
        if (result.address === "null") result.address = null;
        if (result.category === "null") result.category = null;

        return result as ImportedEventData;

    } catch (error) {
        console.error("Error importing event from AI:", error);
        return {
            error: `AI analysis failed. The model might have had trouble interpreting the input. Details: ${error instanceof Error ? error.message : String(error)}`,
            title: '', description: '', datetime: null, end_time: null, address: null, category: null, emoji: null
        };
    }
}