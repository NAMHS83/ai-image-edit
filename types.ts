
export enum AIModelVersion {
  FREE = 'FREE',
  PRO = 'PRO'
}

export enum EditMode {
  FINISH = '마감',
  ERASE = '지우기',
  FURNITURE = '가구',
  DESIGN = '디자인'
}

export enum FinishType {
  WALL = '벽면',
  FLOOR = '바닥',
  CEILING = '천장'
}

export interface AppState {
  version: AIModelVersion | null;
  sceneImage: string | null;
  furnitureImage: string | null;
  materialImage: string | null; 
  designReferenceImage: string | null; // Added for Design mode reference
  editMode: EditMode;
  prompt: string;
  isProcessing: boolean;
  resultImage: string | null;
  maskImage: string | null;
}
