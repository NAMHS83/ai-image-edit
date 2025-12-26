
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, EditMode } from '../types';
import { editSceneImage, testConnection } from '../services/geminiService';
import ImageUploader from './ImageUploader';

interface SceneEditorProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onReset: () => void;
}

const SceneEditor: React.FC<SceneEditorProps> = ({ state, setState, onReset }) => {
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [maskOpacity, setMaskOpacity] = useState(0.6); // Default 60%
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const initCanvas = useCallback(() => {
    if (imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 30;
        // Selection color with dynamic opacity
        ctx.strokeStyle = `rgba(255, 0, 0, ${maskOpacity})`;
        
        // Redraw existing mask if it exists in state
        if (state.maskImage) {
          const maskImg = new Image();
          maskImg.onload = () => {
            ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
          };
          maskImg.src = state.maskImage;
        }
      }
    }
  }, [state.maskImage, maskOpacity]);

  useEffect(() => {
    if (!imageRef.current) return;
    
    const observer = new ResizeObserver(() => {
      initCanvas();
    });
    
    observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, [state.sceneImage, state.editMode, state.resultImage, initCanvas]);

  const saveToHistory = (maskData: string | null) => {
    const newHistory = history.slice(0, historyIndex + 1);
    const updatedHistory = [...newHistory, maskData || ''];
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevMask = history[prevIndex];
      setHistoryIndex(prevIndex);
      setState(prev => ({ ...prev, maskImage: prevMask || null }));
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setState(prev => ({ ...prev, maskImage: null }));
    }
  }, [history, historyIndex, setState]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextMask = history[nextIndex];
      setHistoryIndex(nextIndex);
      setState(prev => ({ ...prev, maskImage: nextMask || null }));
    }
  }, [history, historyIndex, setState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const getPointerPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPointerPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      const dataUrl = canvasRef.current.toDataURL();
      setState(prev => ({ ...prev, maskImage: dataUrl }));
      saveToHistory(dataUrl);
    }
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const pos = getPointerPos(e);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const clearMask = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setState(prev => ({ ...prev, maskImage: null }));
      saveToHistory(null);
    }
  };

  const clearAllEdits = () => {
    if (window.confirm('현재까지의 모든 수정 내용(마스크, 프롬프트, 결과물)을 초기화하고 처음 상태로 돌아가시겠습니까?')) {
      clearMask();
      setHistory([]);
      setHistoryIndex(-1);
      setState(prev => ({
        ...prev,
        editMode: EditMode.FINISH,
        prompt: '',
        resultImage: null,
        furnitureImage: null,
        materialImage: null,
        designReferenceImage: null,
        maskImage: null,
        isProcessing: false
      }));
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (state.isProcessing) return;
    setError(null);
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const result = await editSceneImage(state.version!, state.sceneImage!, state.editMode, {
        prompt: state.prompt,
        furnitureBase64: state.furnitureImage || undefined,
        materialBase64: state.materialImage || undefined,
        designReferenceBase64: state.designReferenceImage || undefined,
        maskBase64: state.maskImage || undefined
      });
      setState(prev => ({ ...prev, resultImage: result, isProcessing: false }));
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API 키 인증 오류가 발생했습니다. 키를 다시 선택해주세요.");
        await (window as any).aistudio.openSelectKey();
      } else {
        setError(err.message || "오류가 발생했습니다.");
      }
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleOpenKeyManager = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Reset test status after opening key manager as the key might have changed
      setConnectionStatus('idle');
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus('loading');
    const result = await testConnection();
    setConnectionStatus(result ? 'success' : 'error');
  };

  const handleFurnitureUpload = (base64: string) => setState(prev => ({ ...prev, furnitureImage: base64 }));
  const handleMaterialUpload = (base64: string) => setState(prev => ({ ...prev, materialImage: base64 }));
  const handleDesignReferenceUpload = (base64: string) => setState(prev => ({ ...prev, designReferenceImage: base64 }));

  const canDraw = !state.resultImage && !state.isProcessing && !isComparing;

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      {/* Sidebar */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col p-6 shadow-2xl z-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-zinc-100">도구 상자</h2>
          <span className={`px-2 py-1 rounded text-[10px] font-bold ${state.version === 'PRO' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-zinc-800 text-zinc-400'}`}>
            {state.version}
          </span>
        </div>

        <div className="space-y-3 mb-8">
          {Object.values(EditMode).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setState(prev => ({ ...prev, editMode: mode, resultImage: null, maskImage: null }));
                setHistory([]);
                setHistoryIndex(-1);
                clearMask();
              }}
              className={`w-full py-3 px-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                state.editMode === mode 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 font-semibold' 
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <span className="text-lg">
                {mode === EditMode.FINISH && '🧱'}
                {mode === EditMode.ERASE && '✨'}
                {mode === EditMode.FURNITURE && '🛋️'}
                {mode === EditMode.DESIGN && '🎨'}
              </span>
              {mode}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {/* Drawing Controls */}
          <div className="mb-6 p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
             <div className="flex items-center justify-between mb-3">
               <span className="text-xs font-bold text-zinc-500 uppercase">그리기 도구</span>
               <div className="flex gap-1">
                 <button 
                  disabled={historyIndex < 0}
                  onClick={undo}
                  className={`p-1.5 rounded-lg transition-colors ${historyIndex < 0 ? 'text-zinc-700' : 'text-zinc-300 hover:bg-zinc-700 hover:text-indigo-400'}`}
                  title="Undo (Ctrl+Z)"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                 </button>
                 <button 
                  disabled={historyIndex >= history.length - 1}
                  onClick={redo}
                  className={`p-1.5 rounded-lg transition-colors ${historyIndex >= history.length - 1 ? 'text-zinc-700' : 'text-zinc-300 hover:bg-zinc-700 hover:text-indigo-400'}`}
                  title="Redo (Ctrl+Y)"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
                 </button>
               </div>
             </div>
             
             {/* Opacity Slider */}
             <div className="mb-4">
               <div className="flex justify-between items-center mb-1.5">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">브러시 불투명도</label>
                 <span className="text-[10px] font-bold text-indigo-400">{Math.round(maskOpacity * 100)}%</span>
               </div>
               <input 
                 type="range" 
                 min="0.1" 
                 max="1" 
                 step="0.01" 
                 value={maskOpacity} 
                 onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
                 className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
               />
             </div>

             <button onClick={clearMask} className="w-full py-2 text-xs text-zinc-400 hover:text-indigo-400 flex items-center justify-center gap-1 border border-zinc-700 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-all">
               <span>↺</span> 영역 선택 초기화
             </button>
          </div>

          {state.editMode === EditMode.FURNITURE && (
            <div className="animate-fade-in space-y-6">
              <div>
                <label className="text-sm font-bold text-zinc-200 mb-3 block">교체할 가구 이미지</label>
                <ImageUploader onUpload={handleFurnitureUpload} label="가구 이미지 업로드" className="mb-4" />
                {state.furnitureImage && (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-700">
                    <img src={state.furnitureImage} alt="Furniture preview" className="w-full h-32 object-contain bg-zinc-800" />
                    <button onClick={() => setState(prev => ({...prev, furnitureImage: null}))} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 shadow-sm hover:bg-black text-red-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {state.editMode === EditMode.FINISH && (
             <div className="animate-fade-in space-y-6">
                <div>
                  <label className="text-sm font-bold text-zinc-200 mb-3 block">마감재 이미지 업로드</label>
                  <ImageUploader onUpload={handleMaterialUpload} label="마감재 업로드" className="mb-4" />
                  {state.materialImage && (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-700">
                      <img src={state.materialImage} alt="Material preview" className="w-full h-24 object-cover bg-zinc-800" />
                      <button onClick={() => setState(prev => ({...prev, materialImage: null}))} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 shadow-sm hover:bg-black text-red-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" /></svg>
                      </button>
                    </div>
                  )}
                </div>
             </div>
          )}

          {state.editMode === EditMode.DESIGN && (
            <div className="animate-fade-in space-y-6">
              <div>
                <label className="text-sm font-bold text-zinc-200 mb-3 block">디자인 레퍼런스</label>
                <ImageUploader onUpload={handleDesignReferenceUpload} label="레퍼런스 업로드" className="mb-4" />
                {state.designReferenceImage && (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-700">
                    <img src={state.designReferenceImage} alt="Reference preview" className="w-full h-24 object-cover bg-zinc-800" />
                    <button onClick={() => setState(prev => ({...prev, designReferenceImage: null}))} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 shadow-sm hover:bg-black text-red-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-4 mt-4 bg-indigo-900/10 rounded-xl border border-indigo-900/30">
            <p className="text-sm text-indigo-300 leading-relaxed">
              {state.editMode === EditMode.ERASE ? '지우고 싶은 물체를 색칠해주세요.' : 
               state.editMode === EditMode.FURNITURE ? '가구가 배치될 위치를 색칠해주세요.' :
               state.editMode === EditMode.FINISH ? '바꿀 영역을 마우스로 색칠해주세요.' :
               '부분 수정을 원하시면 해당 영역을 색칠하세요.'}
            </p>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-zinc-800 space-y-4">
          {error && <div className="p-3 bg-red-900/20 text-red-400 text-xs rounded-lg border border-red-900/30">{error}</div>}
          <div className="flex gap-2">
            <button onClick={clearAllEdits} className="flex-1 py-3 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl font-bold hover:bg-red-900/20 hover:text-red-400 transition-all flex items-center justify-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              리셋
            </button>
            <button onClick={() => setShowSettings(true)} className="w-12 py-3 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 hover:text-indigo-400 transition-all flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>

          <button onClick={handleGenerate} disabled={state.isProcessing} className={`w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${state.isProcessing ? 'bg-zinc-700 text-zinc-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
            {state.isProcessing ? 'AI가 수정 중...' : '수정 이미지 생성하기'}
          </button>
          
          <button onClick={onReset} className="w-full py-3 text-zinc-500 text-sm font-medium hover:text-zinc-300">새 이미지 불러오기</button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col p-8 overflow-hidden relative bg-zinc-950">
        <div ref={containerRef} className="flex-1 flex items-center justify-center bg-zinc-900 rounded-3xl overflow-hidden shadow-inner relative border-4 border-zinc-800">
          <div className="relative max-h-full max-w-full">
            <img 
              ref={imageRef} 
              src={(isComparing || !state.resultImage) ? state.sceneImage! : state.resultImage} 
              alt="Workspace" 
              className={`max-h-[75vh] max-w-full object-contain shadow-2xl transition-opacity duration-300 block ${isComparing ? 'opacity-90' : 'opacity-100'}`}
              onLoad={initCanvas}
            />
            {canDraw && (
              <canvas
                key={`canvas-${historyIndex}`} 
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
              />
            )}
            {isComparing && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <span className="bg-black/60 text-white px-6 py-3 rounded-full font-bold text-lg backdrop-blur-md border border-white/10">원본 이미지 보기 중</span>
              </div>
            )}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-bold tracking-widest uppercase border border-white/10 pointer-events-none shadow-lg">
              🔒 Original Aspect Ratio Locked
            </div>
          </div>
        </div>

        {/* Prompt Input Area */}
        <div className="mt-6 bg-zinc-900 p-6 rounded-3xl shadow-2xl border border-zinc-800 animate-slide-up">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-100 flex items-center justify-between">
              <span>{state.editMode} 프롬프트</span>
              <span className="text-[10px] font-normal text-zinc-500 uppercase tracking-tighter">AI Instructions</span>
            </label>
            <textarea 
              value={state.prompt}
              onChange={(e) => setState(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="구체적인 수정 내용을 입력하세요..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              rows={2}
            />
          </div>
        </div>

        {state.resultImage && (
          <div className="absolute top-12 right-12 flex gap-3 animate-fade-in">
             <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onTouchStart={() => setIsComparing(true)} onTouchEnd={() => setIsComparing(false)} className="px-6 py-3 bg-zinc-800/90 backdrop-blur hover:bg-zinc-700 text-white font-bold rounded-full shadow-xl transition-all flex items-center gap-2 border border-zinc-700 select-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              원본 비교 (누르고 있기)
            </button>
            <a href={state.resultImage} download="ajou-gv-ai-edit.png" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-full shadow-xl hover:bg-indigo-500 transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              이미지 저장
            </a>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 w-96 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-zinc-100">설정</h3>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-zinc-800 rounded-2xl border border-zinc-700">
                <h4 className="text-sm font-bold text-zinc-300 mb-2">API 설정</h4>
                <p className="text-xs text-zinc-500 mb-4">Google AI Studio를 통해 API Key를 안전하게 관리합니다.</p>
                <button onClick={handleOpenKeyManager} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors">
                  API Key 관리 / 변경
                </button>
              </div>

              <div className="p-4 bg-zinc-800 rounded-2xl border border-zinc-700">
                <h4 className="text-sm font-bold text-zinc-300 mb-2">연결 상태</h4>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-zinc-400">Gemini API 연결 확인</span>
                  {connectionStatus === 'loading' && <span className="text-xs text-indigo-400 font-bold">테스트 중...</span>}
                  {connectionStatus === 'success' && <span className="text-xs text-green-400 font-bold">연결 성공</span>}
                  {connectionStatus === 'error' && <span className="text-xs text-red-400 font-bold">연결 실패</span>}
                  {connectionStatus === 'idle' && <span className="text-xs text-zinc-600">-</span>}
                </div>
                <button onClick={handleTestConnection} disabled={connectionStatus === 'loading'} className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                  연결 테스트
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SceneEditor;
