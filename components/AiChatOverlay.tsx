
import React, { useState, useEffect, useRef } from 'react';
import { useAi } from '../contexts/AiContext';
import { CloseIcon, SearchIcon } from './icons/Icons';

const AiChatOverlay: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { messages, isLoaded, isLoading, loadProgress, sendMessage, initializeEngine } = useAi();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && !isLoaded && !isLoading) {
             // Auto-init on open if not loaded? 
             // Optional: Can require manual button press to save data
        }
        if (isOpen) {
             setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [isOpen, messages, isLoaded, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const text = input;
        setInput('');
        await sendMessage(text);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-20 right-4 w-80 sm:w-96 h-[500px] bg-yt-white dark:bg-[#1f1f1f] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-yt-spec-light-20 dark:border-yt-spec-20 animate-fade-in-up">
            {/* Header */}
            <div className="bg-yt-blue text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <h3 className="font-bold">AI アシスタント (Beta)</h3>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
                    <CloseIcon />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/20">
                {!isLoaded ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="mb-4 text-4xl">🧠</div>
                        <h4 className="font-bold mb-2 text-black dark:text-white">ローカルAIを起動</h4>
                        <p className="text-xs text-yt-light-gray mb-6">
                            ブラウザ内で高性能AIモデル(Phi-3)を実行します。<br/>
                            会話内容は外部に送信されません。<br/>
                            <span className="text-red-500">※初回のみ約2GBのダウンロードが必要です。Wi-Fi推奨。</span>
                        </p>
                        {isLoading ? (
                            <div className="w-full">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
                                    <div className="bg-yt-blue h-2.5 rounded-full animate-pulse" style={{width: '100%'}}></div>
                                </div>
                                <p className="text-xs text-yt-blue font-mono">{loadProgress}</p>
                            </div>
                        ) : (
                            <button 
                                onClick={initializeEngine}
                                className="bg-yt-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-full font-bold hover:opacity-80 transition-opacity"
                            >
                                エンジンをダウンロードして開始
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-yt-blue text-white rounded-br-none' 
                                    : 'bg-yt-light dark:bg-yt-spec-20 text-black dark:text-white rounded-bl-none'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-yt-white dark:bg-[#1f1f1f] border-t border-yt-spec-light-20 dark:border-yt-spec-20 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={!isLoaded}
                    placeholder={isLoaded ? "AIにメッセージを送信..." : "エンジン未ロード"}
                    className="flex-1 bg-yt-light dark:bg-black rounded-full px-4 py-2 text-sm outline-none focus:ring-2 ring-yt-blue disabled:opacity-50 dark:text-white"
                />
                <button 
                    type="submit" 
                    disabled={!isLoaded || !input.trim()}
                    className="p-2 bg-yt-light dark:bg-yt-spec-20 rounded-full hover:bg-yt-blue hover:text-white disabled:opacity-30 transition-colors dark:text-white"
                >
                    <SearchIcon /> {/* Just using as send icon proxy */}
                </button>
            </form>
        </div>
    );
};

export default AiChatOverlay;
