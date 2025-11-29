import React, { createContext, useContext, ReactNode } from 'react';

interface CactusSTTContextType {
  isSTTModelDownloaded: boolean;
  isSTTDownloading: boolean;
  sttDownloadProgress: number;
  isSTTReady: boolean;
  sttError: string | null;
  transcription: string;
  downloadSTTModel: () => Promise<void>;
  transcribeAudio: (audioPath: string) => Promise<string | null>;
}

const CactusSTTContext = createContext<CactusSTTContextType | null>(null);

export const CactusSTTProvider = ({ children }: { children: ReactNode }) => {
  const mockValue: CactusSTTContextType = {
    isSTTModelDownloaded: false,
    isSTTDownloading: false,
    sttDownloadProgress: 0,
    isSTTReady: false,
    sttError: 'Speech-to-text requires a native platform (Android/iOS). Not available on web.',
    transcription: '',
    downloadSTTModel: async () => {
      console.warn('STT not available on web');
    },
    transcribeAudio: async (audioPath: string) => {
      console.warn('STT not available on web');
      return null;
    },
  };

  return (
    <CactusSTTContext.Provider value={mockValue}>
      {children}
    </CactusSTTContext.Provider>
  );
};

export const useSTT = () => {
  const context = useContext(CactusSTTContext);
  if (!context) {
    throw new Error('useSTT must be used within CactusSTTProvider');
  }
  return context;
};
