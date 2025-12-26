
import React from 'react';
import { AIModelVersion } from '../types';

interface ModelSelectorProps {
  onSelect: (version: AIModelVersion) => void;
  hasApiKey: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onSelect, hasApiKey }) => {
  
  const openKeyManager = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Note: In a real app we might want to refresh the hasApiKey state here via a callback,
      // but for now relying on the next interaction or reload is acceptable as per flow.
      window.location.reload(); 
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 animate-fade-in relative">
      {/* Settings Button */}
      <button 
        onClick={openKeyManager}
        className="absolute top-6 right-6 p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full hover:text-white hover:border-zinc-600 transition-all"
        title="API Key 관리"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>

      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">
          Ajou GV AI studio
        </h1>
        <p className="text-xl text-zinc-400">전문가 수준의 인테리어 수정을 AI와 함께 시작하세요</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Free Version */}
        <div 
          onClick={() => onSelect(AIModelVersion.FREE)}
          className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-sm hover:shadow-2xl hover:border-indigo-500 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-900/50 transition-colors">
            <span className="text-2xl">🌱</span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">무료 버전</h2>
          <p className="text-zinc-400 mb-6">Gemini Flash를 활용한 빠르고 가벼운 수정 기능</p>
          <ul className="space-y-3 mb-8 text-zinc-500 text-sm">
            <li className="flex items-center gap-2">✓ 기본적인 마감재 변경</li>
            <li className="flex items-center gap-2">✓ 빠른 이미지 생성 속도</li>
            <li className="flex items-center gap-2">✓ 지우기 및 디자인 제안</li>
          </ul>
          <button className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-xl font-semibold group-hover:bg-white transition-colors">
            무료로 시작하기
          </button>
        </div>

        {/* Pro Version */}
        <div 
          onClick={() => hasApiKey && onSelect(AIModelVersion.PRO)}
          className={`bg-zinc-900 p-8 rounded-3xl border-2 shadow-sm transition-all relative overflow-hidden group
            ${hasApiKey 
              ? 'border-zinc-800 hover:shadow-2xl hover:border-indigo-500 cursor-pointer' 
              : 'border-zinc-800 opacity-60 cursor-not-allowed grayscale'
            }`}
        >
          {!hasApiKey && (
            <div className="absolute inset-0 bg-black/50 z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
              <div className="bg-zinc-800 p-4 rounded-full mb-3 shadow-xl">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <p className="text-white font-bold text-lg">이용 불가</p>
              <p className="text-zinc-400 text-sm mt-1">연동된 API Key가 없습니다</p>
            </div>
          )}

          <div className="absolute top-4 right-4 bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Premium
          </div>
          <div className={`w-12 h-12 bg-indigo-950 rounded-2xl flex items-center justify-center mb-6 transition-colors ${hasApiKey ? 'group-hover:bg-indigo-600' : ''}`}>
            <span className="text-2xl">⚡</span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Nano Banana Pro</h2>
          <p className="text-zinc-400 mb-6">Gemini 3 Pro로 구현하는 최고 품질의 실사 렌더링</p>
          <ul className="space-y-3 mb-8 text-zinc-500 text-sm">
            <li className="flex items-center gap-2 text-indigo-400 font-medium">✓ 초고해상도 실사 품질</li>
            <li className="flex items-center gap-2 text-indigo-400 font-medium">✓ 복잡한 가구 합성 최적화</li>
            <li className="flex items-center gap-2 text-indigo-400 font-medium">✓ 정교한 물리 조명 연산</li>
          </ul>
          <button 
            disabled={!hasApiKey}
            className={`w-full py-4 rounded-xl font-semibold transition-colors ${
              hasApiKey 
                ? 'bg-indigo-600 text-white hover:bg-indigo-500' 
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {hasApiKey ? 'Pro 버전 시작하기' : 'API Key 필요'}
          </button>
        </div>
      </div>
      
      <p className="mt-12 text-zinc-500 text-xs text-center max-w-md">
        API Key 관리 메뉴에서 키를 등록하면 Pro 버전을 사용할 수 있습니다.
      </p>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ModelSelector;
