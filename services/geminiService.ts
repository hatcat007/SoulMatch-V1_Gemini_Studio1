


import { GoogleGenAI, Type } from "@google/genai";
import type { User } from '../types';

// FIX: Aligned with Gemini API guidelines.
// API key is expected to be in environment variables and is a hard requirement.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    // FIX: Configured the model to return JSON with a specific schema for reliability.
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