import React, { createContext, useContext, ReactNode } from 'react';

interface CactusContextType {
  isModelDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isModelReady: boolean;
  error: string | null;
  downloadModel: () => Promise<void>;
  embed: (text: string) => Promise<number[] | null>;
  complete: (query: string) => Promise<string | null>;
}

const CactusContext = createContext<CactusContextType | null>(null);

export const CactusProvider = ({ children }: { children: ReactNode }) => {
  const mockValue: CactusContextType = {
    isModelDownloaded: false,
    isDownloading: false,
    downloadProgress: 0,
    isModelReady: false,
    error: 'This app requires a native platform (Android/iOS). Cactus SDK is not available on web.',
    downloadModel: async () => {
      console.warn('Cactus not available on web');
    },
    embed: async (text: string) => {
      console.warn('Cactus not available on web');
      return null;
    },
    complete: async (query: string) => {
      console.warn('Cactus not available on web');
      return 'This feature requires a native platform. Please use Android or iOS.';
    },
  };

  return (
    <CactusContext.Provider value={mockValue}>
      {children}
    </CactusContext.Provider>
  );
};

export const useCactus = () => {
  const context = useContext(CactusContext);
  if (!context) {
    throw new Error('useCactus must be used within CactusProvider');
  }
  return context;
};
