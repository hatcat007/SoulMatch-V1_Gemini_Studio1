
import { GoogleGenAI } from "@google/genai";
import type { User } from '../types';

// IMPORTANT: API key must be set in environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.warn("API_KEY for Gemini is not set. Gemini services will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

/**
 * Generates a list of recommended user IDs based on a user's profile.
 * This is a conceptual example of how Gemini could power the matching feature.
 * @param currentUser - The user for whom to generate matches.
 * @param allUsers - A list of all potential users to match against.
 * @returns A list of user IDs sorted by match compatibility.
 */
export async function getAiMatches(currentUser: User, allUsers: User[]): Promise<number[]> {
  if (!apiKey) {
    // Return a random subset if API key is not available
    return allUsers.filter(u => u.id !== currentUser.id).map(u => u.id).sort(() => 0.5 - Math.random()).slice(0, 5);
  }

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
    });
    
    // In a real application, you would need to configure the model to return JSON
    // and parse it safely.
    const textResponse = response.text.trim();
    const matches = JSON.parse(textResponse);
    return matches as number[];
  } catch (error) {
    console.error("Error fetching AI matches:", error);
    // Fallback to random matches on error
    return allUsers.filter(u => u.id !== currentUser.id).map(u => u.id).sort(() => 0.5 - Math.random()).slice(0, 5);
  }
}
