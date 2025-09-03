import { GoogleGenAI } from "@google/genai";
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
