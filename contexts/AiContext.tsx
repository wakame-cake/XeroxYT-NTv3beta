
import React, { createContext, useState, useContext, ReactNode, useRef, useEffect } from 'react';
import * as webllm from "@mlc-ai/web-llm";
import { useHistory } from './HistoryContext';
import { useSubscription } from './SubscriptionContext';
import { usePreference } from './PreferenceContext';
import { inferTopInterests, buildUserProfile } from '../utils/xrai';

// Use Phi-3.5-mini-instruct for high performance (12B equivalent reasoning) with low VRAM usage
const SELECTED_MODEL = "Phi-3.5-mini-instruct-q4f16_1-MLC"; 

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AiContextType {
  messages: ChatMessage[];
  isLoaded: boolean;
  isLoading: boolean;
  loadProgress: string;
  sendMessage: (text: string) => Promise<void>;
  initializeEngine: () => Promise<void>;
  resetChat: () => void;
}

const AiContext = createContext<AiContextType | undefined>(undefined);

export const AiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState('');
  
  const engine = useRef<webllm.MLCEngine | null>(null);
  const { history } = useHistory();
  const { subscribedChannels } = useSubscription();
  const { preferredGenres } = usePreference();

  // Construct system prompt based on XRAI profile
  const getSystemPrompt = () => {
    const profile = buildUserProfile({
        watchHistory: history,
        searchHistory: [], // Can add if available in context
        subscribedChannels: subscribedChannels
    });
    const interests = inferTopInterests(profile, 10);
    const userContext = `
    User Interests: ${interests.join(', ')}
    Preferred Genres: ${preferredGenres.join(', ')}
    Recent History: ${history.slice(0, 5).map(v => v.title).join(', ')}
    `;

    return `あなたは動画共有サイト「XeroxYT」のAIアシスタントです。
    ユーザーの視聴履歴や好みを分析し、親しみやすい日本語で会話してください。
    あなたの役割は、動画の推薦、雑談、そしてユーザーの興味を深掘りすることです。
    
    [ユーザー情報]
    ${userContext}
    
    回答は短く、簡潔に、フレンドリーにしてください。絵文字も適度に使用してください。`;
  };

  const initializeEngine = async () => {
    if (engine.current || isLoading) return;
    
    setIsLoading(true);
    setLoadProgress('エンジンの初期化中...');

    try {
      const initProgressCallback = (report: webllm.InitProgressReport) => {
        setLoadProgress(report.text);
      };

      const newEngine = await webllm.CreateMLCEngine(
        SELECTED_MODEL,
        { initProgressCallback: initProgressCallback }
      );

      engine.current = newEngine;
      setIsLoaded(true);
      
      // Initial greeting
      const initialMsg = { role: 'assistant' as const, content: 'こんにちは！XeroxYTのAIアシスタントです。👋\nあなたの好みに合わせた動画探しをお手伝いします。何か聞きたいことはありますか？' };
      setMessages([initialMsg]);

    } catch (error) {
      console.error("Failed to load WebLLM:", error);
      setLoadProgress('AIエンジンのロードに失敗しました。WebGPU対応ブラウザか確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!engine.current || !text.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Dynamic System Prompt injection
      const historyMsgs = messages.map(m => ({ role: m.role, content: m.content }));
      const prompt = [
          { role: 'system', content: getSystemPrompt() },
          ...historyMsgs,
          userMsg
      ];

      const reply = await engine.current.chat.completions.create({
        messages: prompt as any,
        temperature: 0.7,
        max_tokens: 256, // Keep responses concise
      });

      const assistantMsg: ChatMessage = { 
        role: 'assistant', 
        content: reply.choices[0].message.content || 'すみません、うまく答えられませんでした。' 
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat generation failed:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度試してください。' }]);
    }
  };

  const resetChat = () => {
      if(engine.current) {
          engine.current.resetChat();
      }
      setMessages([]);
      initializeEngine(); // Re-init to send greeting
  };

  return (
    <AiContext.Provider value={{ messages, isLoaded, isLoading, loadProgress, sendMessage, initializeEngine, resetChat }}>
      {children}
    </AiContext.Provider>
  );
};

export const useAi = (): AiContextType => {
  const context = useContext(AiContext);
  if (context === undefined) {
    throw new Error('useAi must be used within an AiProvider');
  }
  return context;
};
