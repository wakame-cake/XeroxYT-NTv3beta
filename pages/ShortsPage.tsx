
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ShortsPlayer from '../components/ShortsPlayer';
import { getPlayerConfig, getShortsComments, type ShortsComment } from '../utils/api';
import { getXraiShorts } from '../utils/recommendation';
import type { Video } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useSearchHistory } from '../contexts/SearchHistoryContext';
import { useHistory } from '../contexts/HistoryContext';
import { usePreference } from '../contexts/PreferenceContext';
import { ChevronRightIcon, ChevronLeftIcon, LikeIcon, CommentIcon, CloseIcon } from '../components/icons/Icons';

// Rotation icons for up/down navigation
const ChevronUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 24 24" width="32" className="fill-current text-white">
        <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
    </svg>
);

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="32" viewBox="0 0 24 24" width="32" className="fill-current text-white">
        <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
    </svg>
);

const ShortsPage: React.FC = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playerParams, setPlayerParams] = useState<string | null>(null);
    
    // Comments state
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<ShortsComment[]>([]);
    const [totalCommentCount, setTotalCommentCount] = useState<string>('');
    const [areCommentsLoading, setAreCommentsLoading] = useState(false);

    const { subscribedChannels } = useSubscription();
    const { searchHistory } = useSearchHistory();
    const { history: watchHistory } = useHistory();
    const { ngKeywords, ngChannels, hiddenVideos, negativeKeywords } = usePreference();
    
    // Prevent double fetch in strict mode
    const loadedRef = useRef(false);

    const loadShorts = useCallback(async () => {
        if (loadedRef.current) return;
        loadedRef.current = true;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const paramsPromise = getPlayerConfig();
            
            // Use XRAI for Shorts
            const videosPromise = getXraiShorts({
                searchHistory,
                watchHistory,
                subscribedChannels,
                ngKeywords,
                ngChannels,
                hiddenVideos,
                negativeKeywords,
                page: 1
            });
            
            const [params, shorts] = await Promise.all([
                paramsPromise,
                videosPromise,
            ]);
            
            setPlayerParams(params);
            
            if (shorts.length === 0) {
                 setError("ショート動画が見つかりませんでした。");
            } else {
                setVideos(shorts);
            }

        } catch (err: any) {
            setError(err.message || 'ショート動画の読み込みに失敗しました。');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [searchHistory, watchHistory, subscribedChannels, ngKeywords, ngChannels, hiddenVideos, negativeKeywords]);

    useEffect(() => {
        loadShorts();
    }, [loadShorts]);
    
    // Reset comments when video changes
    useEffect(() => {
        setShowComments(false);
        setComments([]);
    }, [currentIndex]);

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < videos.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Ideally load more here
            // For now, just loop or stop
        }
    };

    const handleToggleComments = async () => {
        if (!showComments) {
            setShowComments(true);
            if (comments.length === 0 && videos[currentIndex]) {
                setAreCommentsLoading(true);
                const data = await getShortsComments(videos[currentIndex].id);
                setComments(data.comments);
                setTotalCommentCount(data.totalCommentCount);
                setAreCommentsLoading(false);
            }
        } else {
            setShowComments(false);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') handlePrev();
            if (e.key === 'ArrowDown') handleNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, videos.length]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yt-blue"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg m-4">{error}</div>;
    }
    
    if (videos.length === 0 || !playerParams) return null;

    const currentVideo = videos[currentIndex];

    return (
        // Added pt-8 to prevent overlap with header
        <div className="flex justify-center items-center h-[calc(100vh-3.5rem)] w-full overflow-hidden relative pt-8 bg-yt-black/95">
            <div className="relative flex items-end justify-center gap-4 h-full pb-8">
                
                {/* Main Player Container */}
                <div className="relative h-[80vh] aspect-[9/16] rounded-2xl shadow-2xl overflow-hidden bg-black flex-shrink-0">
                     <ShortsPlayer video={currentVideo} playerParams={playerParams} />
                     
                     {/* Comments Drawer (Overlay inside player) */}
                     {showComments && (
                        <div className="absolute inset-y-0 right-0 w-full sm:w-[360px] bg-yt-white dark:bg-yt-light-black shadow-xl z-20 flex flex-col animate-fade-in-main">
                             <div className="flex items-center justify-between p-4 border-b border-yt-spec-light-20 dark:border-yt-spec-20">
                                 <h3 className="font-bold text-black dark:text-white">コメント {totalCommentCount && `(${totalCommentCount})`}</h3>
                                 <button onClick={() => setShowComments(false)} className="p-2 hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10 rounded-full">
                                     <CloseIcon />
                                 </button>
                             </div>
                             <div className="flex-1 overflow-y-auto p-4">
                                 {areCommentsLoading ? (
                                     <div className="flex justify-center py-8">
                                         <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yt-blue"></div>
                                     </div>
                                 ) : comments.length > 0 ? (
                                     <div className="space-y-4">
                                         {comments.map((comment, idx) => (
                                             <div key={idx} className="flex gap-3">
                                                 <img src={comment.authorIcon} alt={comment.author} className="w-8 h-8 rounded-full" />
                                                 <div className="flex-1">
                                                     <div className="flex items-center gap-2 mb-1">
                                                         <span className="text-sm font-semibold text-yt-light-gray">{comment.author}</span>
                                                         <span className="text-xs text-yt-light-gray">{comment.date}</span>
                                                     </div>
                                                     <p className="text-sm text-black dark:text-white whitespace-pre-wrap leading-tight">{comment.text}</p>
                                                     <div className="flex items-center gap-1 mt-1">
                                                         <LikeIcon />
                                                         <span className="text-xs text-yt-light-gray">{comment.likes}</span>
                                                     </div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 ) : (
                                     <div className="text-center text-yt-light-gray py-10">コメントはありません</div>
                                 )}
                             </div>
                        </div>
                     )}
                </div>

                {/* Navigation & Action Controls (Right Side) */}
                <div className="flex flex-col gap-6 pb-2">
                    <div className="flex flex-col gap-4">
                        <button className="flex flex-col items-center p-3 rounded-full bg-yt-light-black/50 hover:bg-yt-light-black backdrop-blur-sm transition-all group">
                            <div className="p-1"><LikeIcon /></div>
                            <span className="text-xs font-semibold text-white mt-1">高評価</span>
                        </button>
                        
                        <button 
                            onClick={handleToggleComments}
                            className="flex flex-col items-center p-3 rounded-full bg-yt-light-black/50 hover:bg-yt-light-black backdrop-blur-sm transition-all group"
                        >
                            <div className="p-1"><CommentIcon /></div>
                            <span className="text-xs font-semibold text-white mt-1">コメント</span>
                        </button>
                    </div>

                    <div className="h-4"></div> {/* Spacer */}

                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                            className={`p-3 rounded-full bg-yt-light-black/50 hover:bg-yt-light-black backdrop-blur-sm transition-all ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
                            aria-label="前の動画"
                        >
                            <ChevronUpIcon />
                        </button>
                        <button 
                            onClick={handleNext}
                            disabled={currentIndex === videos.length - 1}
                            className={`p-3 rounded-full bg-yt-light-black/50 hover:bg-yt-light-black backdrop-blur-sm transition-all ${currentIndex === videos.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
                            aria-label="次の動画"
                        >
                            <ChevronDownIcon />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default ShortsPage;
