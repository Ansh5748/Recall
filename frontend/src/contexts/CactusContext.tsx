import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCactusLM } from 'cactus-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const MODEL_DOWNLOAD_KEY = 'cactus_model_downloaded';
const MODEL_NAME = 'qwen3-0.6';

export const CactusProvider = ({ children }: { children: ReactNode }) => {
  const cactusLM = useCactusLM({ model: MODEL_NAME });
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);

  // Check if model was previously downloaded
  useEffect(() => {
    const checkModelStatus = async () => {
      try {
        const downloaded = await AsyncStorage.getItem(MODEL_DOWNLOAD_KEY);
        if (downloaded === 'true') {
          setIsModelDownloaded(true);
          // Initialize the model
          await cactusLM.init();
          setIsModelReady(true);
        }
      } catch (error) {
        console.error('Error checking model status:', error);
      }
    };
    checkModelStatus();
  }, []);

  const downloadModel = async () => {
    try {
      await cactusLM.download();
      await AsyncStorage.setItem(MODEL_DOWNLOAD_KEY, 'true');
      setIsModelDownloaded(true);
      // Initialize after download
      await cactusLM.init();
      setIsModelReady(true);
    } catch (error) {
      console.error('Error downloading model:', error);
      throw error;
    }
  };

  const embed = async (text: string): Promise<number[] | null> => {
    if (!isModelReady) {
      console.warn('Model not ready for embedding');
      return null;
    }
    
    try {
      const result = await cactusLM.embed({ text });
      return result.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  };

  const complete = async (query: string): Promise<string | null> => {
    if (!isModelReady) {
      console.warn('Model not ready for completion');
      return null;
    }
    
    try {
      const result = await cactusLM.complete({
        messages: [{ role: 'user', content: query }],
        options: {
          maxTokens: 256,
          temperature: 0.7,
        },
      });
      return result.response;
    } catch (error) {
      console.error('Error generating completion:', error);
      return null;
    }
  };

  return (
    <CactusContext.Provider
      value={{
        isModelDownloaded,
        isDownloading: cactusLM.isDownloading,
        downloadProgress: cactusLM.downloadProgress,
        isModelReady,
        error: cactusLM.error,
        downloadModel,
        embed,
        complete,
      }}
    >
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