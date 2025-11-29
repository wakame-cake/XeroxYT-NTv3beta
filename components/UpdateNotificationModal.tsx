import React from 'react';
import { CloseIcon, BugIcon, ShortsIcon } from './icons/Icons';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-yt-white/90 dark:bg-yt-light-black/80 backdrop-blur-lg w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh] border border-yt-spec-light-20 dark:border-yt-spec-20 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-yt-spec-light-20 dark:border-yt-spec-20 flex justify-between items-center">
          <h2 className="text-xl font-bold text-black dark:text-white">新機能のお知らせ</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-yt-spec-light-10 dark:hover:bg-yt-spec-10">
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-6 text-black dark:text-white">
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ShortsIcon /> ショート機能</h3>
            <p className="text-sm leading-relaxed">ホーム、検索、チャンネルページにショート動画が追加されました。専用プレイヤーで、マウスホイールや画面の矢印ボタンを使って快適に次の動画へ移動できます。</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">XRAI (AIモデル) 搭載</h3>
            <p className="text-sm leading-relaxed">あなたの視聴履歴や好みを分析し、よりパーソナライズされた動画をおすすめします。使えば使うほど、おすすめの精度が向上します。</p>
          </div>
           <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><BugIcon /> バグ修正</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>関連動画が一部の環境で表示されない問題を修正しました。</li>
              <li>チャンネル情報が正しく取得できない（N/A）場合にホームページへ移動するように修正しました。</li>
            </ul>
          </div>
        </div>
        <div className="p-4 border-t border-yt-spec-light-20 dark:border-yt-spec-20 text-right">
          <button
            onClick={onClose}
            className="bg-yt-blue text-white font-semibold px-6 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotificationModal;