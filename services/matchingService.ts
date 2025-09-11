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
    interestAndTagPercent: number; // Jaccard-style similarity percentage
    interestJaccard: number;       // New: Interest overlap robustness
    tagJaccard: number;            // New: Tag overlap robustness
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
        const [poleA, poleB] = poles[dimKey];

        if (userDim) {
            if (userDim.dominant_trait === poleA) {
                map[poleA] = userDim.score;
                map[poleB] = 100 - userDim.score;
            } else {
                map[poleB] = userDim.score;
                map[poleA] = 100 - userDim.score;
            }
        } else {
            map[poleA] = 50;
            map[poleB] = 50;
        }
    });
    return map;
};

/**
 * Calculates the personality similarity score between two users based on their dimension maps.
 * Uses non-linear distance scaling: small differences are rewarded more, large differences penalized harder.
 * @param currentUserMap - A map of the current user's dimension scores (0-100 for each pole).
 * @param otherUserMap - A map of the other user's dimension scores.
 * @returns A similarity score from 0 to 100.
 */
function calculatePersonalityScore(
    currentUserMap: Record<string, number>,
    otherUserMap: Record<string, number>
): number {
    let totalScaledDistance = 0;
    const dimensionPoles = ['I', 'S', 'T', 'J'];

    dimensionPoles.forEach(pole => {
        const currentUserPoleScore = currentUserMap[pole] || 50;
        const otherUserPoleScore = otherUserMap[pole] || 50;
        const rawDiff = Math.abs(currentUserPoleScore - otherUserPoleScore);

        // Non-linear penalty: diffs under 20 are gently penalized, over 60 harshly
        let scaledDiff = 0;
        if (rawDiff <= 20) {
            scaledDiff = rawDiff * 0.5; // gentle
        } else if (rawDiff <= 60) {
            scaledDiff = 10 + (rawDiff - 20) * 1.0; // linear
        } else {
            scaledDiff = 50 + (rawDiff - 60) * 2.0; // harsh
        }

        totalScaledDistance += scaledDiff;
    });

    // Max possible scaled distance is 4*(10 + 40*1 + 40*2) = 4*(10+40+80)=520? Let’s cap at 400 for simplicity
    const maxScaledDistance = 400;
    const similarity = Math.max(0, (1 - (totalScaledDistance / maxScaledDistance)) * 100);

    return Math.round(Math.min(100, similarity));
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
 * Calculates Jaccard similarity index for two sets (shared / union).
 * Returns 0 if both sets are empty.
 */
function calculateJaccardSimilarity(setA: Set<number>, setB: Set<number>): number {
    if (setA.size === 0 && setB.size === 0) return 0;

    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;

    return union === 0 ? 0 : (intersection / union);
}


/**
 * Applies a decay penalty to sparse profiles to avoid overrating matches with very few items.
 * Example: if user has only 1 interest, even 100% match is penalized slightly.
 */
function applySparsityDecay(value: number, setSize: number, minSizeForFullCredit = 3): number {
    if (setSize >= minSizeForFullCredit) return value;
    const decayFactor = setSize / minSizeForFullCredit;
    return value * decayFactor;
}


/**
 * A centralized matching algorithm that calculates compatibility based on personality, interests, and a combined score.
 * Now uses adaptive weighting, Jaccard similarity, and non-linear scoring for more intelligent matching.
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

    const currentUserInterestCount = currentUser.interests.length;
    const currentUserTagCount = currentUser.personality_tags.length;

    const scoredMatches: MatchDetails[] = potentialMatches.map(otherUser => {
        // 1. Calculate Personality Score
        const otherUserDimensionMap = getDimensionMap(otherUser.dimensions);
        const personalityScore = calculatePersonalityScore(currentUserDimensionMap, otherUserDimensionMap);

        // 2. Find shared interests and tags
        const sharedInterests = findSharedInterests(currentUserInterestIds, otherUser.interests);
        const sharedTags = findSharedTags(currentUserTagIds, otherUser.personality_tags);
        const interestCount = sharedInterests.length;
        const tagCount = sharedTags.length;

        const otherUserInterestIds = new Set(otherUser.interests.map(i => i.id));
        const otherUserTagIds = new Set(otherUser.personality_tags.map(t => t.id));

        // 3. Calculate Jaccard similarities
        const interestJaccard = calculateJaccardSimilarity(currentUserInterestIds, otherUserInterestIds);
        const tagJaccard = calculateJaccardSimilarity(currentUserTagIds, otherUserTagIds);

        // 4. Apply sparsity decay to prevent overrating matches with tiny profiles
        const decayedInterestJaccard = applySparsityDecay(interestJaccard * 100, currentUserInterestCount);
        const decayedTagJaccard = applySparsityDecay(tagJaccard * 100, currentUserTagCount);

        // 5. Normalize counts for display (but Jaccard used for scoring)
        const normalizedInterestScore = currentUserInterestCount > 0 ? (interestCount / currentUserInterestCount) * 100 : 0;
        const normalizedTagScore = currentUserTagCount > 0 ? (tagCount / currentUserTagCount) * 100 : 0;

        // 6. Calculate Combined Score with ADAPTIVE WEIGHTING
        // If user has no interests/tags, lean heavier on personality
        let personalityWeight = 0.5;
        let interestWeight = 0.3;
        let tagWeight = 0.2;

        if (currentUserInterestCount === 0 && currentUserTagCount === 0) {
            personalityWeight = 1.0;
            interestWeight = 0;
            tagWeight = 0;
        } else if (currentUserInterestCount === 0) {
            personalityWeight = 0.6;
            interestWeight = 0;
            tagWeight = 0.4;
        } else if (currentUserTagCount === 0) {
            personalityWeight = 0.6;
            interestWeight = 0.4;
            tagWeight = 0;
        }

        const combinedScore = Math.round(
            (personalityWeight * personalityScore) +
            (interestWeight * decayedInterestJaccard) +
            (tagWeight * decayedTagJaccard)
        );

        // 7. Calculate weighted interest + tag score for the 'Interests' tab
        const interestAndTagPercent = Math.round(
            (0.7 * decayedInterestJaccard) +
            (0.3 * decayedTagJaccard)
        );

        return {
            user: otherUser,
            scores: {
                combined: Math.min(100, Math.max(0, combinedScore)),
                personality: personalityScore,
                interestCount: interestCount,
                tagCount: tagCount,
                interestAndTagPercent: Math.min(100, Math.max(0, interestAndTagPercent)),
                interestJaccard: Math.round(decayedInterestJaccard),
                tagJaccard: Math.round(decayedTagJaccard),
            },
            commonalities: {
                interests: sharedInterests,
                tags: sharedTags,
            }
        };
    });

    // Sort with tie-breaking: if primary score equal, use secondary (personality, then interest/tag)
    const sortWithTiebreak = (a: MatchDetails, b: MatchDetails, primary: keyof MatchDetails['scores'], secondary: keyof MatchDetails['scores'], tertiary?: keyof MatchDetails['scores']) => {
        if (a.scores[primary] !== b.scores[primary]) {
            return b.scores[primary] - a.scores[primary];
        }
        if (a.scores[secondary] !== b.scores[secondary]) {
            return b.scores[secondary] - a.scores[secondary];
        }
        if (tertiary && a.scores[tertiary] !== b.scores[tertiary]) {
            return b.scores[tertiary] - a.scores[tertiary];
        }
        return 0; // retain order
    };

    const combined = [...scoredMatches].sort((a, b) =>
        sortWithTiebreak(a, b, 'combined', 'personality', 'interestAndTagPercent')
    );

    const personality = [...scoredMatches].sort((a, b) =>
        sortWithTiebreak(a, b, 'personality', 'interestAndTagPercent', 'combined')
    );

    const interests = [...scoredMatches].sort((a, b) =>
        sortWithTiebreak(a, b, 'interestAndTagPercent', 'tagJaccard', 'personality')
    );

    return { combined, personality, interests };
}