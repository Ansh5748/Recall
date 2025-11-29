import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';
import { useSTT } from '../contexts/CactusSTTContext';

export const useVoiceInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const { transcribeAudio, isSTTReady, downloadSTTModel, isSTTDownloading } = useSTT();

  const startRecording = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Voice input requires a native device.');
      return false;
    }

    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant microphone permission to use voice input.');
        return false;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      recordingRef.current = recording;
      setIsRecording(true);
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      return false;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!recordingRef.current) {
      return null;
    }

    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        Alert.alert('Error', 'Failed to save recording.');
        return null;
      }

      // Check if STT model is ready
      if (!isSTTReady && !isSTTDownloading) {
        Alert.alert(
          'Download Required',
          'The speech recognition model needs to be downloaded first (~100MB). This is a one-time download.',
          [
            {
              text: 'Download Now',
              onPress: async () => {
                try {
                  await downloadSTTModel();
                } catch (error) {
                  Alert.alert('Error', 'Failed to download speech model.');
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return null;
      }

      if (!isSTTReady) {
        Alert.alert('Please Wait', 'Speech recognition model is still downloading...');
        return null;
      }

      // Transcribe the audio
      setIsTranscribing(true);
      const transcription = await transcribeAudio(uri);
      setIsTranscribing(false);

      // Clean up audio file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (error) {
        console.warn('Failed to delete audio file:', error);
      }

      return transcription;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsTranscribing(false);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
      return null;
    }
  };

  const cancelRecording = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch (error) {
        console.error('Failed to cancel recording:', error);
      }
      recordingRef.current = null;
      setIsRecording(false);
    }
  };

  return {
    isRecording,
    isTranscribing,
    isSTTReady,
    isSTTDownloading,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
