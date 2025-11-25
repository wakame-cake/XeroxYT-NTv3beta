
import type { Video, Channel } from '../types';
import { getExternalRelatedVideos } from './api';

// --- Types ---

interface RecommendationSource {
    searchHistory: string[];
    watchHistory: Video[];
    subscribedChannels: Channel[];
    ngKeywords: string[];
    ngChannels: string[];
    page: number;
}

// --- Helpers ---

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

/**
 * XRAI: Random History-Based Recommendation Engine
 * 
 * New Logic:
 * 1. Pick 10 random videos from watch history as "seeds".
 * 2. Fetch related videos for these 10 seeds using `getExternalRelatedVideos`.
 * 3. Combine and shuffle.
 */
export const getXraiRecommendations = async (sources: RecommendationSource): Promise<Video[]> => {
    const { 
        watchHistory, 
        ngKeywords,
        ngChannels
    } = sources;

    // --- 1. SEED SELECTION ---
    let seeds: string[] = [];
    
    if (watchHistory.length > 0) {
        // Pick 10 random videos from history
        const historySample = shuffleArray(watchHistory).slice(0, 10);
        seeds = historySample.map(v => v.id);
    } else {
        // Cold start fallback: popular video IDs or similar (Hardcoded for now if no history)
        // You might want to add a default list of trending IDs here for cold start
        seeds = ["jNQXAC9IVRw", "5qap5aO4i9A"]; // Example defaults (Me at the zoo, Lofi Girl)
    }

    // --- 2. CANDIDATE GENERATION ---
    // Fetch results for ALL seeds concurrently using the external API
    const promises = seeds.map(videoId => 
        getExternalRelatedVideos(videoId).catch(() => [])
    );
    
    const nestedResults = await Promise.all(promises);
    let candidates = nestedResults.flat();
    
    // Deduplicate
    const seenIds = new Set<string>();
    candidates = candidates.filter(v => {
        if (seenIds.has(v.id)) return false;
        seenIds.add(v.id);
        return true;
    });

    // --- 3. NG FILTERING (Safety) ---
    candidates = candidates.filter(v => {
        const fullText = `${v.title} ${v.channelName}`.toLowerCase();
        if (ngKeywords.some(ng => fullText.includes(ng.toLowerCase()))) return false;
        if (ngChannels.includes(v.channelId)) return false;
        return true;
    });

    // --- 4. SHUFFLING ---
    return shuffleArray(candidates);
};
