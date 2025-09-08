import type { User, UserPersonalityDimension, Interest, PersonalityTag } from '../types';

// Define a type for the user data after it's been processed for matching
interface MatchableUser extends User {
    interests: Interest[];
    dimensions: UserPersonalityDimension[];
    personality_tags: PersonalityTag[];
}

// Define the structure for the results
export interface MatchDetails {
  user: User;
  scores: {
    combined: number;
    personality: number;
    interestCount: number;
    tagCount: number;
    interestAndTagPercent: number; // New score for interest/tag match percentage
  };
  commonalities: {
    interests: Interest[];
    tags: PersonalityTag[];
  };
}

export interface MatchResults {
    combined: MatchDetails[];
    personality: MatchDetails[];
    interests: MatchDetails[];
}


/**
 * Converts a user's dimension array into a map of all 8 poles, each with a score from 0 to 100.
 * Example: A user who is 70% Introvert will be mapped to { I: 70, E: 30, ... }.
 * If a dimension is missing, it defaults to a neutral 50/50 split.
 * @param dims - The user's array of personality dimensions.
 * @returns A record mapping each personality trait (I, E, S, N, etc.) to a 0-100 score.
 */
const getDimensionMap = (dims: UserPersonalityDimension[]): Record<string, number> => {
    const map: Record<string, number> = {};
    const poles: Record<string, string[]> = {
        EI: ['I', 'E'], SN: ['S', 'N'],
        TF: ['T', 'F'], JP: ['J', 'P']
    };

    Object.keys(poles).forEach(dimKey => {
        const userDim = dims.find(d => d.dimension === dimKey);
        const [poleA, poleB] = poles[dimKey]; // e.g., I, E

        if (userDim) {
            if (userDim.dominant_trait === poleA) {
                map[poleA] = userDim.score;
                map[poleB] = 100 - userDim.score;
            } else { // dominant_trait must be poleB
                map[poleB] = userDim.score;
                map[poleA] = 100 - userDim.score;
            }
        } else {
            // If dimension data is missing for a user, assume they are neutral.
            map[poleA] = 50;
            map[poleB] = 50;
        }
    });
    return map;
};

/**
 * Calculates the personality similarity score between two users based on their dimension maps.
 * A lower distance means a better match.
 * @param currentUserMap - A map of the current user's dimension scores (0-100 for each pole).
 * @param otherUserMap - A map of the other user's dimension scores.
 * @returns A similarity score from 0 to 100.
 */
function calculatePersonalityScore(
    currentUserMap: Record<string, number>,
    otherUserMap: Record<string, number>
): number {
    let totalDistance = 0;
    // We only need to compare one pole from each dimension (e.g., I, S, T, J) to get the distance.
    const dimensionPoles = ['I', 'S', 'T', 'J'];

    dimensionPoles.forEach(pole => {
        const currentUserPoleScore = currentUserMap[pole] || 50;
        const otherUserPoleScore = otherUserMap[pole] || 50;
        totalDistance += Math.abs(currentUserPoleScore - otherUserPoleScore);
    });

    // Max distance is 100 for each of the 4 dimensions.
    const maxDistance = 400; 
    const similarity = Math.max(0, (1 - (totalDistance / maxDistance)) * 100);

    return Math.round(similarity);
}


/**
 * Finds the shared interests between two users.
 * @param currentUserInterests - A Set of the current user's interest IDs.
 * @param otherUserInterests - An array of the other user's interests.
 * @returns An array of the shared Interest objects.
 */
function findSharedInterests(
    currentUserInterests: Set<number>,
    otherUserInterests: Interest[]
): Interest[] {
    return otherUserInterests.filter(interest => currentUserInterests.has(interest.id));
}

/**
 * Finds the shared personality tags between two users.
 * @param currentUserTags - A Set of the current user's tag IDs.
 * @param otherUserTags - An array of the other user's tags.
 * @returns An array of the shared PersonalityTag objects.
 */
function findSharedTags(
    currentUserTags: Set<number>,
    otherUserTags: PersonalityTag[]
): PersonalityTag[] {
    return otherUserTags.filter(tag => currentUserTags.has(tag.id));
}


/**
 * A centralized matching algorithm that calculates compatibility based on personality, interests, and a combined score.
 * @param currentUser The user for whom to find matches.
 * @param potentialMatches An array of other users to compare against.
 * @returns An object containing three sorted arrays of matched users with detailed score breakdowns.
 */
export function calculateMatches(
    currentUser: MatchableUser,
    potentialMatches: MatchableUser[]
): MatchResults {

    const currentUserDimensionMap = getDimensionMap(currentUser.dimensions);
    const currentUserInterestIds = new Set(currentUser.interests.map(i => i.id));
    const currentUserTagIds = new Set(currentUser.personality_tags.map(t => t.id));

    const scoredMatches: MatchDetails[] = potentialMatches.map(otherUser => {
        // 1. Calculate Personality Score
        const otherUserDimensionMap = getDimensionMap(otherUser.dimensions);
        const personalityScore = calculatePersonalityScore(currentUserDimensionMap, otherUserDimensionMap);

        // 2. Find shared interests and tags
        const sharedInterests = findSharedInterests(currentUserInterestIds, otherUser.interests);
        const sharedTags = findSharedTags(currentUserTagIds, otherUser.personality_tags);
        const interestCount = sharedInterests.length;
        const tagCount = sharedTags.length;

        // 3. Normalize interest and tag scores for weighting
        const numCurrentUserInterests = currentUser.interests.length;
        const numCurrentUserTags = currentUser.personality_tags.length;

        const normalizedInterestScore = numCurrentUserInterests > 0 ? (interestCount / numCurrentUserInterests) * 100 : 0;
        const normalizedTagScore = numCurrentUserTags > 0 ? (tagCount / numCurrentUserTags) * 100 : 0;
            
        // 4. Calculate Combined Score
        const combinedScore = Math.round(
            (0.5 * personalityScore) +
            (0.3 * normalizedInterestScore) +
            (0.2 * normalizedTagScore)
        );
        
        // 5. Calculate weighted interest + tag score for the 'Interests' tab
        const interestAndTagPercent = Math.round(
            (0.7 * normalizedInterestScore) +
            (0.3 * normalizedTagScore)
        );

        return {
            user: otherUser,
            scores: {
                combined: combinedScore,
                personality: personalityScore,
                interestCount: interestCount,
                tagCount: tagCount,
                interestAndTagPercent: interestAndTagPercent,
            },
            commonalities: {
                interests: sharedInterests,
                tags: sharedTags,
            }
        };
    });

    // Sort the lists based on their respective primary score
    const combined = [...scoredMatches].sort((a, b) => b.scores.combined - a.scores.combined);
    const personality = [...scoredMatches].sort((a, b) => b.scores.personality - a.scores.personality);
    const interests = [...scoredMatches].sort((a, b) => b.scores.interestAndTagPercent - a.scores.interestAndTagPercent);

    return { combined, personality, interests };
}