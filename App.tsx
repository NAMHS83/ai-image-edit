
import React, { useState, useCallback } from 'react';
import { AIModelVersion, EditMode, AppState } from './types';
import ModelSelector from './components/ModelSelector';
import ImageUploader from './components/ImageUploader';
import SceneEditor from './components/SceneEditor';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    version: null,
    sceneImage: null,
    furnitureImage: null,
    materialImage: null,
    designReferenceImage: null,
    editMode: EditMode.FINISH,
    prompt: '',
    isProcessing: false,
    resultImage: null,
    maskImage: null,
  });

  const handleSelectVersion = async (version: AIModelVersion) => {
    if (version === AIModelVersion.PRO) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }
    }
    setState(prev => ({ ...prev, version }));
  };

  const handleImageUpload = (base64: string) => {
    setState(prev => ({ ...prev, sceneImage: base64, resultImage: null, maskImage: null }));
  };

  const reset = () => {
    setState({
      version: null,
      sceneImage: null,
      furnitureImage: null,
      materialImage: null,
      designReferenceImage: null,
      editMode: EditMode.FINISH,
      prompt: '',
      isProcessing: false,
      resultImage: null,
      maskImage: null,
    });
  };

  if (!state.version) {
    return <ModelSelector onSelect={handleSelectVersion} />;
  }

  if (!state.sceneImage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950">
        <div className="max-w-xl w-full">
          <button 
            onClick={reset}
            className="mb-8 text-sm font-medium text-zinc-400 hover:text-indigo-400 transition-colors flex items-center gap-2"
          >
            ← 메인으로 돌아가기
          </button>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">시작하기 위해 Scene 이미지를 올려주세요</h1>
          <p className="text-zinc-400 mb-8">드래그 앤 드롭으로 방이나 공간의 이미지를 업로드할 수 있습니다.</p>
          <ImageUploader onUpload={handleImageUpload} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <SceneEditor 
        state={state}
        setState={setState}
        onReset={reset}
      />
    </div>
  );
};

export default App;