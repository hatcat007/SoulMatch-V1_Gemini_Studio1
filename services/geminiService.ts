
import { GoogleGenAI, Type } from "@google/genai";
import type { User, Interest, UserTrait } from '../types';

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
 * Generates a ranked list of compatible friends based on bios and personality traits.
 * @param currentUser The user for whom to find matches.
 * @param allOtherUsers A list of potential users to match against.
 * @returns A list of user IDs sorted by compatibility.
 */
export async function findCompatibleFriends(currentUser: User, allOtherUsers: User[]): Promise<number[]> {
  const formatTraits = (user: User) => {
    if (!user.user_traits || user.user_traits.length === 0) {
      return 'No personality data available.';
    }
    return user.user_traits.map(t => `- ${t.trait}: ${t.value}`).join('\n');
  };

  const prompt = `
    You are a sophisticated matchmaking AI for SoulMatch, an app designed to combat loneliness by creating meaningful friendships. Your goal is to find compatible friends, NOT romantic partners.

    Analyze the current user's profile and compare it against a list of potential matches. Consider shared interests mentioned in bios, life philosophies, and complementary personality traits. A good match could be someone very similar, or someone with different but complementary traits that would lead to a balanced friendship.

    Current User (ID: ${currentUser.id}):
    - Bio: "${currentUser.bio}"
    - Personality Type: ${currentUser.personality_type || 'Not specified'}
    - Traits:
      ${formatTraits(currentUser)}

    ---

    Potential Matches:
    ${allOtherUsers.map(u => `
    User ID: ${u.id}
    Bio: "${u.bio}"
    Personality Type: ${u.personality_type || 'Not specified'}
    Traits:
      ${formatTraits(u)}
    `).join('\n\n')}

    ---

    Based on your analysis, return a JSON array of user IDs, ordered from the most compatible to the least. Only include IDs from the "Potential Matches" list. The output must be ONLY the JSON array.
    Example output: [102, 105, 101]
  `;
  
  try {
    const aiClient = getAiClient();
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
        },
      },
    });

    const textResponse = response.text.trim();
    const matches = JSON.parse(textResponse);
    return matches as number[];
  } catch (error) {
    console.error("Error fetching AI friend matches:", error);
    // Fallback to a random shuffle on error.
    return allOtherUsers.map(u => u.id).sort(() => 0.5 - Math.random());
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

    // Step 1: Generate a clean, English, visually descriptive prompt using Gemini Flash.
    const imagePromptGeneratorPrompt = `
        You are an AI assistant that creates effective image generation prompts. Based on the Danish event details below, create a concise, visually descriptive prompt in English. The prompt should be safe for all audiences and focus on themes of community, friendship, and positive social interaction.

        Event Details:
        - Title: "${title || 'Untitled Event'}"
        - Description: "${description}"
        - Desired Style: ${style}
        - ${includeTitle ? 'The user wants the event title text to be subtly included in the image.' : 'The user does not want any text in the image.'}

        Your output must be ONLY the English prompt, ready to be sent to an image generation model like Imagen. Do not add any explanations or markdown.
        Example: "A vibrant, realistic photo of a cozy board game cafe filled with diverse young people laughing and playing together."
        Another Example: "A colorful, friendly illustration of a group of friends having a picnic in a sunny park."
    `;

    let imageGenPrompt = '';
    try {
        const promptResponse = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: imagePromptGeneratorPrompt,
        });
        imageGenPrompt = promptResponse.text.trim();

        if (!imageGenPrompt) {
            throw new Error("Text model failed to generate an image prompt.");
        }

    } catch (textGenError) {
        console.error("Error generating image prompt from text model:", textGenError);
        // Fallback to a generic prompt if the text model fails
        imageGenPrompt = `A ${style} image showing friends enjoying a social activity together, in a friendly atmosphere.`;
    }

    // Step 2: Use the generated prompt to create the image with Imagen.
    try {
        const response = await aiClient.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imageGenPrompt, // Use the new, clean prompt
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
        console.error("Error generating event image from AI (Imagen step):", error);
        throw new Error(`AI image generation failed. The prompt might have been blocked for safety reasons. Please try a different description. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function generatePlaceImageFromText(
    description: string,
    placeName: string,
    style: 'realistic' | 'illustration',
    numberOfImages: number = 1
): Promise<string[]> {
    const aiClient = getAiClient();

    // Step 1: Generate a clean, English, visually descriptive prompt.
    const imagePromptGeneratorPrompt = `
        You are an AI assistant that creates effective image generation prompts. Based on the Danish details of a social venue below, create a concise, visually descriptive prompt in English. The prompt must be safe for all audiences and focus on a welcoming, cozy atmosphere where people can connect. Do not include any text in the final image.

        Venue Details:
        - Name: "${placeName}"
        - Description: "${description}"
        - Desired Style: ${style}

        Your output must be ONLY the English prompt, ready to be sent to an image generation model like Imagen. Do not add any explanations or markdown.
        Example: "A realistic, warm-toned photo of the interior of a cozy, bustling coffee shop with people chatting at small tables."
    `;
    
    let imageGenPrompt = '';
    try {
        const promptResponse = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: imagePromptGeneratorPrompt,
        });
        imageGenPrompt = promptResponse.text.trim();
        if (!imageGenPrompt) {
            throw new Error("Text model failed to generate an image prompt for the place.");
        }
    } catch (textGenError) {
        console.error("Error generating image prompt for place:", textGenError);
        imageGenPrompt = `A ${style} image of a welcoming social place, like a cafe or community center, with a cozy atmosphere.`;
    }

    // Step 2: Use the generated prompt to create the image.
    try {
        const response = await aiClient.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imageGenPrompt,
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
        console.error("Error generating place image from AI (Imagen step):", error);
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
            You are an expert event data extractor for an app called SoulMatch. Your goal is to analyze the provided event information (from text and/or images) and return a structured JSON object.

            **CRITICAL INSTRUCTIONS:**
            1.  **Extract & Refine:**
                *   **title:** Extract the event title.
                *   **description:** IMPORTANT! Rewrite the provided description to be clean, engaging, and welcoming for app users. The tone should be friendly. Based on the emoji level '${emojiLevel}', incorporate emojis naturally into this new description. ('none' = no emojis, 'some' = a few, 'many' = use generously, 'ai' = use your judgment).
                *   **datetime:** Find the start date and time. Format as a single ISO 8601 string ('YYYY-MM-DDTHH:mm'). Assume Europe/Copenhagen timezone. If you find multiple possibilities, put them in 'datetime_options' and set this to null.
                *   **end_time:** Find the end date and time if available. Format as ISO 8601. If not found, set to null.
                *   **address:** Extract the full, single-line address (street, number, city, zip).
            2.  **Categorize & Decorate:**
                *   **category:** From this EXACT list, pick the ONE most relevant category: [${categoryOptions.join(', ')}].
                *   **emoji:** From this EXACT list, pick the ONE best emoji for the event icon: [${emojiOptions.join(', ')}].
            3.  **Output Format:**
                *   Your entire response MUST be ONLY the JSON object. Do not include any other text, explanations, or markdown.

            **Event Information to Analyze:**
            ---
            ${text || '(No text provided)'}
            ---
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