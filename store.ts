
import { create } from 'zustand';
import { ShapeType, ParticleTheme, HandData } from './types';

interface AppState {
  currentShape: ShapeType;
  setShape: (shape: ShapeType) => void;
  
  theme: ParticleTheme;
  setTheme: (theme: Partial<ParticleTheme>) => void;
  
  // We use a ref-like pattern for high-frequency updates to avoid re-renders
  // but for the store we keep reactive state for UI
  handData: HandData;
  setHandData: (data: HandData) => void;

  showDebug: boolean;
  toggleDebug: () => void;

  isCameraActive: boolean;
  toggleCamera: () => void;
}

export const useStore = create<AppState>((set) => ({
  currentShape: ShapeType.HEART,
  setShape: (shape) => set({ currentShape: shape }),
  
  theme: {
    primaryColor: '#ff0066',
    secondaryColor: '#00ffff',
    particleSize: 0.15,
    speed: 1.0,
  },
  setTheme: (newTheme) => set((state) => ({ theme: { ...state.theme, ...newTheme } })),
  
  handData: {
    leftHandOpenness: 0,
    rightHandOpenness: 0,
    leftHandPinch: 0,
    rightHandPinch: 0,
    leftHandLandmarks: [],
    rightHandLandmarks: [],
    isPresent: false,
  },
  setHandData: (data) => set({ handData: data }),

  showDebug: false,
  toggleDebug: () => set((state) => ({ showDebug: !state.showDebug })),

  isCameraActive: true,
  toggleCamera: () => set((state) => ({ isCameraActive: !state.isCameraActive })),
}));
