import React, { createContext, useContext, ReactNode } from 'react';
import { useCactusSTT } from 'cactus-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

const STT_MODEL_DOWNLOAD_KEY = 'cactus_stt_model_downloaded';
const STT_MODEL_NAME = 'whisper-small';

export const CactusSTTProvider = ({ children }: { children: ReactNode }) => {
  const cactusSTT = useCactusSTT({ model: STT_MODEL_NAME });
  const [isSTTModelDownloaded, setIsSTTModelDownloaded] = React.useState(false);
  const [isSTTReady, setIsSTTReady] = React.useState(false);

  // Check if STT model was previously downloaded
  React.useEffect(() => {
    const checkSTTModelStatus = async () => {
      if (Platform.OS === 'web') {
        return; // Skip on web
      }
      
      try {
        const downloaded = await AsyncStorage.getItem(STT_MODEL_DOWNLOAD_KEY);
        if (downloaded === 'true') {
          setIsSTTModelDownloaded(true);
          // Initialize the STT model
          await cactusSTT.init();
          setIsSTTReady(true);
        }
      } catch (error) {
        console.error('Error checking STT model status:', error);
      }
    };
    checkSTTModelStatus();
  }, []);

  const downloadSTTModel = async () => {
    if (Platform.OS === 'web') {
      console.warn('STT not available on web');
      return;
    }
    
    try {
      await cactusSTT.download();
      await AsyncStorage.setItem(STT_MODEL_DOWNLOAD_KEY, 'true');
      setIsSTTModelDownloaded(true);
      // Initialize after download
      await cactusSTT.init();
      setIsSTTReady(true);
    } catch (error) {
      console.error('Error downloading STT model:', error);
      throw error;
    }
  };

  const transcribeAudio = async (audioPath: string): Promise<string | null> => {
    if (!isSTTReady) {
      console.warn('STT model not ready');
      return null;
    }
    
    try {
      const result = await cactusSTT.transcribe({
        audioFilePath: audioPath,
      });
      return result.response;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return null;
    }
  };

  return (
    <CactusSTTContext.Provider
      value={{
        isSTTModelDownloaded,
        isSTTDownloading: cactusSTT.isDownloading,
        sttDownloadProgress: cactusSTT.downloadProgress,
        isSTTReady,
        sttError: cactusSTT.error,
        transcription: cactusSTT.transcription,
        downloadSTTModel,
        transcribeAudio,
      }}
    >
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
