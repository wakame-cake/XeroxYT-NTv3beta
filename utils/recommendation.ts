
import type { Video, Channel } from '../types';
import { searchVideos, getChannelVideos, getRecommendedVideos } from './api';

// --- Trick 1: 拡張された多様性トピックリスト (ニュースを除外し、興味深い分野を網羅) ---
const DIVERSITY_TOPICS = [
    'ASMR', 'ガジェット', 'キャンプ', '料理', 'プログラミング', 
    '宇宙', '都市伝説', 'ライフハック', 'DIY', '筋トレ', 
    '猫', '犬', '旅行', 'ストリートフード', '映画レビュー', 
    'アニメ考察', 'ゲーム実況', 'Vtuber', '歌ってみた', 'MV',
    '建築', '歴史ミステリー', '科学実験', '心理学', '雑学'
];

// --- Trick 2: ニュース・政治・不快コンテンツの強力なNGワードリスト ---
const NEWS_BLOCK_KEYWORDS = [
    'ニュース', 'News', '報道', '政治', '首相', '大統領', '内閣', 
    '事件', '事故', '逮捕', '裁判', '速報', '会見', '訃報', '地震', 
    '津波', '災害', '炎上', '物申す', '批判', '晒し', '閲覧注意',
    '衆院選', '参院選', '選挙', '与党', '野党', '政策', '経済効果',
    'NHK', '日テレNEWS', 'FNN', 'TBS', 'ANN', 'テレ東BIZ'
];

// --- Trick 3: クエリの類語展開 (検索の幅を広げる) ---
const QUERY_EXPANSIONS: Record<string, string[]> = {
    'Game': ['Gameplay', '実況', '解説', 'RTA', '神プレイ'],
    'Music': ['Playlist', 'MV', 'Live Performance', '作業用BGM', 'Cover'],
    'Cat': ['Kitten', '猫動画', '癒し'],
    'Cooking': ['Recipe', 'Street Food', '料理', '大食い'],
    'Anime': ['AMV', '考察', '名シーン', 'reaction'],
    'Tech': ['Review', 'Unboxing', 'Gadget', 'PC build'],
};

// --- Trick 4: 時間帯によるムード判定 ---
const getTimeBasedTopic = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'Morning Routine Vlog BGM'; // 朝: 爽やか
    if (hour >= 10 && hour < 17) return 'Productivity Music';      // 昼: 作業・活発
    if (hour >= 17 && hour < 22) return 'Entertainment Variety';   // 夜: エンタメ
    return 'Relaxing ASMR Sleep';                                  // 深夜: リラックス
};

// --- Trick 5: 曜日によるムード判定 ---
const getDayBasedTopic = (): string => {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return 'Full Movie Documentary'; // 週末: 長尺
    return 'Shorts Lifehacks'; // 平日: 短尺・効率
};

const extractKeywords = (text: string): string[] => {
    if (!text) return [];
    const hashtags = text.match(/#[^\s#]+/g) || [];
    const brackets = text.match(/[\[【](.+?)[\]】]/g) || [];
    const rawText = text.replace(/[\[【].+?[\]】]/g, '').replace(/#[^\s#]+/g, '');
    const words = rawText.replace(/[!-/:-@[-`{-~]/g, ' ').split(/\s+/);
    
    const cleanHashtags = hashtags.map(t => t.trim());
    const cleanBrackets = brackets.map(t => t.replace(/[\[【\]】]/g, '').trim());
    const cleanWords = words.filter(w => 
        w.length > 1 && 
        !/^(http|www|com|jp|youtube|video|movie|the|and|of|in|to|for|on|with|movie|動画|公式|ch|channel|チャンネル)/i.test(w)
    );
    return Array.from(new Set([...cleanHashtags, ...cleanBrackets, ...cleanWords]));
};

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const parseDurationToSeconds = (isoDuration: string): number => {
    if (!isoDuration) return 0;
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = isoDuration.match(regex);
    if (!matches) return 0;
    const h = parseInt(matches[1] || '0', 10);
    const m = parseInt(matches[2] || '0', 10);
    const s = parseInt(matches[3] || '0', 10);
    return h * 3600 + m * 60 + s;
};

export const containsJapanese = (text: string): boolean => {
    return /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+/.test(text);
}

interface RecommendationSource {
    searchHistory: string[];
    watchHistory: Video[];
    subscribedChannels: Channel[];
    preferredGenres: string[];
    preferredChannels: string[];
    preferredDurations?: string[];
    preferredFreshness?: string;
    discoveryMode?: string;
    ngKeywords?: string[];
    ngChannels?: string[];
    prefDepth?: string;
    prefVocal?: string;
    prefInfoEnt?: string;
    prefVisual?: string;
    prefCommunity?: string;
    page: number;
}

// --- Trick 6: バリデーションロジックの強化 ---
const validateVideo = (
    video: Video, 
    source: RecommendationSource
): { isValid: boolean; score: number; reasons: string[] } => {
    let score = 0;
    const reasons: string[] = [];
    
    const lowerTitle = video.title.toLowerCase();
    const lowerDesc = (video.descriptionSnippet || '').toLowerCase();
    const lowerChannel = video.channelName.toLowerCase();
    const fullText = `${lowerTitle} ${lowerDesc} ${lowerChannel}`;

    // 0. Xerox Filter (必須)
    if (fullText.includes('xerox') && video.channelId !== 'UCCMV3NfZk_NB-MmUvHj6aFw') {
        return { isValid: false, score: -9999, reasons: ['Keyword Exclusion: Xerox'] };
    }

    // --- Trick 7: ニュースブロックの実装 ---
    if (NEWS_BLOCK_KEYWORDS.some(word => fullText.includes(word.toLowerCase()))) {
        return { isValid: false, score: -9999, reasons: ['News Block'] };
    }

    // --- Trick 8: タイトルスパム判定 (過剰な感嘆符や大文字) ---
    if ((video.title.match(/!/g) || []).length > 5 || (video.title.match(/[A-Z]/g) || []).length > 30) {
        score -= 20; // スコアを下げるが除外はしない
    }

    // 1. NG Filter
    if (source.ngKeywords?.some(ng => fullText.includes(ng.toLowerCase()))) {
        return { isValid: false, score: -9999, reasons: ['NG Keyword'] };
    }
    if (source.ngChannels?.includes(video.channelId)) {
        return { isValid: false, score: -9999, reasons: ['NG Channel'] };
    }

    // 2. Duration Filter
    if (source.preferredDurations && source.preferredDurations.length > 0) {
        const sec = parseDurationToSeconds(video.isoDuration);
        let durationMatch = false;
        if (source.preferredDurations.includes('short') && sec > 0 && sec < 240) durationMatch = true;
        if (source.preferredDurations.includes('medium') && sec >= 240 && sec <= 1200) durationMatch = true;
        if (source.preferredDurations.includes('long') && sec > 1200) durationMatch = true;

        if (!durationMatch && sec > 0) {
            return { isValid: false, score: -500, reasons: ['Duration Mismatch'] };
        }
    }

    // --- Trick 9: History Relevance (スコア加点) ---
    if (source.watchHistory.some(h => h.channelId === video.channelId)) {
        score += 15;
    }

    // --- Trick 10: Freshness Bonus (新着ブースト) ---
    if (video.uploadedAt.includes('分前') || video.uploadedAt.includes('時間前')) {
        score += 20;
    }

    // --- Trick 11: Japanese Priority (日本語優先) ---
    if (containsJapanese(fullText)) {
        score += 30;
    }

    return { isValid: true, score, reasons };
};

export const getDeeplyAnalyzedRecommendations = async (sources: RecommendationSource): Promise<Video[]> => {
    const { 
        searchHistory, watchHistory, subscribedChannels, 
        preferredGenres, page 
    } = sources;
    
    const queries: Set<string> = new Set();
    
    // --- Trick 12: 取得クエリ数の増加 (より多くのソースから集める) ---
    const TOTAL_QUERIES = page === 1 ? 6 : 10;
    
    // 重み付けロジック
    let wHistory = 30;
    let wSubs = 20;
    let wTrending = 25; // 急上昇の重要度アップ
    let wDiversity = 25; // 多様性の重要度アップ

    // --- Trick 13: 新規ユーザー/ヘビーユーザーの動的重み調整 ---
    if (watchHistory.length === 0 && subscribedChannels.length <= 1) {
        wHistory = 0;
        wSubs = 0;
        wTrending = 50;
        wDiversity = 50;
    }

    const querySources = [
        { type: 'history', weight: wHistory }, 
        { type: 'subs', weight: wSubs },
        { type: 'trending', weight: wTrending },
        { type: 'diversity', weight: wDiversity }
    ];

    const getRandomSourceType = () => {
        const totalWeight = querySources.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        for (const source of querySources) {
            if (random < source.weight) return source.type;
            random -= source.weight;
        }
        return 'diversity';
    };

    for (let i = 0; i < TOTAL_QUERIES; i++) {
        const type = getRandomSourceType();

        switch (type) {
            case 'history':
                if (watchHistory.length > 0) {
                    // --- Trick 14: インバースヒストリー (見た履歴と"逆"または少しずらした提案はAPI検索では難しいが、関連動画から辿る) ---
                    const randomVideo = watchHistory[Math.floor(Math.random() * Math.min(watchHistory.length, 20))];
                    // タイトル全体ではなく、キーワード抽出して検索
                    const kws = extractKeywords(randomVideo.title);
                    if (kws.length > 0) {
                        const kw = kws[Math.floor(Math.random() * kws.length)];
                        // --- Trick 3 (適用): 類語展開 ---
                        if (QUERY_EXPANSIONS[kw]) {
                            queries.add(QUERY_EXPANSIONS[kw][Math.floor(Math.random() * QUERY_EXPANSIONS[kw].length)]);
                        } else {
                            queries.add(kw);
                        }
                    }
                } else if (searchHistory.length > 0) {
                    queries.add(searchHistory[Math.floor(Math.random() * searchHistory.length)]);
                }
                break;
            
            case 'subs':
                if (subscribedChannels.length > 0) {
                    const randomChannel = subscribedChannels[Math.floor(Math.random() * subscribedChannels.length)];
                    queries.add(randomChannel.name);
                }
                break;
            
            case 'trending':
                // --- Trick 15: トレンドキーワードの注入 ---
                // API側で急上昇を取得するが、検索ワードとしても人気タグを使う
                queries.add("急上昇");
                break;

            case 'diversity':
            default:
                // --- Trick 16: 時間・曜日・ランダムトピックの混合 ---
                const r = Math.random();
                if (r < 0.3) queries.add(getTimeBasedTopic());
                else if (r < 0.5) queries.add(getDayBasedTopic());
                else queries.add(DIVERSITY_TOPICS[Math.floor(Math.random() * DIVERSITY_TOPICS.length)]);
                break;
        }
    }

    if (queries.size === 0) {
        queries.add('Trending Japan');
        queries.add('Music');
    }

    // --- Trick 17: 急上昇動画の直接取得とマージ ---
    // 検索APIだけでなく、急上昇エンドポイントを並行して叩く
    const queryArray = Array.from(queries);
    const fetchPromises = queryArray.map(q => 
        searchVideos(q, page.toString())
        .then(res => res.videos)
        .catch(e => { console.warn(`Query failed: ${q}`, e); return []; })
    );

    // ページ1の場合は必ず急上昇を含める
    const trendingPromise = (page === 1 || Math.random() > 0.5) 
        ? getRecommendedVideos().then(res => res.videos).catch(() => [])
        : Promise.resolve([]);

    // 登録チャンネルの動画も含める
    const subPromises = subscribedChannels.length > 0 
        ? shuffleArray(subscribedChannels).slice(0, 3).map(c => getChannelVideos(c.id).then(res => res.videos).catch(() => []))
        : [];

    const allResults = await Promise.all([...fetchPromises, trendingPromise, ...subPromises]);
    const candidates = allResults.flat();
    
    // --- Trick 18: 重複排除とスコアリング ---
    const validVideos: Video[] = [];
    const seenIds = new Set<string>();
    
    for (const video of candidates) {
        if (seenIds.has(video.id)) continue;
        seenIds.add(video.id);

        const validation = validateVideo(video, sources);
        if (validation.isValid) {
            (video as any)._score = validation.score;
            validVideos.push(video);
        }
    }
    
    // --- Trick 19: 同一チャンネルの出現制限 (Diversity Enforcement) ---
    const channelCounts: Record<string, number> = {};
    const filteredVideos = validVideos.filter(v => {
        // 1ページあたり、同じチャンネルは2つまで
        const count = channelCounts[v.channelId] || 0;
        if (count >= 2) return false;
        channelCounts[v.channelId] = count + 1;
        return true;
    });

    // スコア順にソート
    filteredVideos.sort((a, b) => ((b as any)._score || 0) - ((a as any)._score || 0));
    
    // 上位から候補を選出
    const topVideos = filteredVideos.slice(0, 60);

    // --- Trick 20: エントロピー注入 (完全なスコア順ではなく、少しシャッフルして「ゆらぎ」を持たせる) ---
    // 完全にランダムだと質が下がるので、上位グループ内でシャッフル
    return shuffleArray(topVideos);
};
