
import React from 'react';
import { AIModelVersion } from '../types';

interface ModelSelectorProps {
  onSelect: (version: AIModelVersion) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
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
          onClick={() => onSelect(AIModelVersion.PRO)}
          className="bg-zinc-900 p-8 rounded-3xl border-2 border-zinc-800 shadow-sm hover:shadow-2xl hover:border-indigo-500 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-4 right-4 bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Premium
          </div>
          <div className="w-12 h-12 bg-indigo-950 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
            <span className="text-2xl">⚡</span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Nano Banana Pro</h2>
          <p className="text-zinc-400 mb-6">Gemini 3 Pro로 구현하는 최고 품질의 실사 렌더링</p>
          <ul className="space-y-3 mb-8 text-zinc-500 text-sm">
            <li className="flex items-center gap-2 text-indigo-400 font-medium">✓ 초고해상도 실사 품질</li>
            <li className="flex items-center gap-2 text-indigo-400 font-medium">✓ 복잡한 가구 합성 최적화</li>
            <li className="flex items-center gap-2 text-indigo-400 font-medium">✓ 정교한 물리 조명 연산</li>
          </ul>
          <button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-colors">
            Pro 버전 시작하기
          </button>
        </div>
      </div>
      
      <p className="mt-12 text-zinc-500 text-xs text-center max-w-md">
        Pro 버전은 Google AI Studio의 빌딩 설정이 완료된 API Key가 필요할 수 있습니다.
      </p>
    </div>
  );
};

export default ModelSelector;