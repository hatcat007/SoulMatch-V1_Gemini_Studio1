import { GoogleGenAI, Type } from "@google/genai";
import type { User, Interest } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
 * @param user - The user object containing bio and other details.
 * @param interests - A list of the user's interests.
 * @param testType - The depth of the analysis requested ('short' or 'long').
 * @param answers - The user's answers to the personality test questions.
 * @returns A structured personality analysis result.
 */
export async function analyzePersonality(
    user: User,
    interests: Interest[],
    testType: 'short' | 'long',
    answers: { question: string; answer: number }[]
): Promise<PersonalityAnalysisResult> {
    const interestNames = interests.map(i => i.name).join(', ');
    const answersText = answers.map(a => `- Question: "${a.question}"\n  - Answer (0-100, 50 is neutral, 0 is strongly disagree, 100 is strongly agree): ${a.answer}`).join('\n');

    const prompt = `
        You are a sophisticated personality analysis AI for an app called SoulMatch.
        Your task is to analyze the provided user data and generate a personality profile based on the 16 Personalities model (like INFJ, ENFP, etc.) and a set of specific trait scores.

        User Data:
        - Bio: "${user.bio}"
        - Interests: ${interestNames}
        - Requested Test Type: ${testType}
        - Personality Test Answers:
        ${answersText}

        Analyze ALL the provided data (bio, interests, AND especially the test answers) to determine the user's 4-letter personality type.
        Then, determine scores (from 0 to 100) for the following four traits. A score of 50 is neutral/balanced.
        1.  **Abstrakt opfattelse**: High score means more abstract, low score means more observant.
        2.  **Emotionel tænkning**: High score means more feeling-based decisions, low score means more logic-based.
        3.  **Rationel tænkning**: High score means more logic-based, low score means more feeling-based. (This should be somewhat inverse to the one above).
        4.  **Konkret opfattelse**: High score means more observant/practical, low score means more abstract. (This should be somewhat inverse to the one above).

        Based on your analysis, return a JSON object with the user's 4-letter personality type and the scores for these four specific traits.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        personality_type: { type: Type.STRING },
                        traits: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    trait: { type: Type.STRING },
                                    value: { type: Type.INTEGER }
                                },
                                required: ["trait", "value"]
                            }
                        }
                    },
                    required: ["personality_type", "traits"]
                },
            },
        });
        
        const textResponse = response.text.trim();
        const result = JSON.parse(textResponse);
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.INTEGER,
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