import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCactus } from '../src/contexts/CactusContext';
import { Ionicons } from '@expo/vector-icons';

export default function DownloadScreen() {
  const router = useRouter();
  const { isModelDownloaded, isDownloading, downloadProgress, downloadModel, error } = useCactus();
  const [autoStarted, setAutoStarted] = useState(false);
  const isWeb = Platform.OS === 'web';

  // Auto-start download on first launch (only on native)
  useEffect(() => {
    if (!isWeb && !isModelDownloaded && !isDownloading && !autoStarted) {
      setAutoStarted(true);
      handleDownload();
    }
  }, [isModelDownloaded, isDownloading, isWeb]);

  // Navigate to main app when download completes
  useEffect(() => {
    if (isModelDownloaded && !isDownloading) {
      setTimeout(() => {
        router.replace('/(tabs)/memories');
      }, 1000);
    }
  }, [isModelDownloaded, isDownloading]);

  // Auto-redirect on web after showing message
  useEffect(() => {
    if (isWeb) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)/memories');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isWeb]);

  const handleDownload = async () => {
    try {
      await downloadModel();
    } catch (err) {
      console.error('Download error:', err);
      // On web, just proceed to app
      if (isWeb) {
        router.replace('/(tabs)/memories');
      } else {
      Alert.alert(
        'Download Failed',
        'Failed to download the AI model. Please check your internet connection and try again.',
        [{ text: 'OK' }]
        );
      }
    }
  };

  const handleSkipToApp = () => {
    router.replace('/(tabs)/memories');
  };

  const getProgressPercentage = () => {
    return Math.round(downloadProgress * 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="download-outline" size={80} color="#007AFF" />
        
        <Text style={styles.title}>Setting Up Your Memory</Text>
        <Text style={styles.subtitle}>
          Downloading AI model for offline intelligence
        </Text>
        <Text style={styles.description}>
          This is a one-time download (~200MB) that enables the app to work completely offline with on-device AI.
        </Text>

        {isDownloading ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.progressText}>
              Downloading: {getProgressPercentage()}%
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${getProgressPercentage()}%` },
                ]}
              />
            </View>
          </View>
        ) : isModelDownloaded ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#34C759" />
            <Text style={styles.successText}>Ready to go!</Text>
          </View>
        ) : (
        <>
            {!isWeb ? (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownload}
          >
            <Text style={styles.downloadButtonText}>Start Download</Text>
          </TouchableOpacity>
        ) : (
              <View style={styles.webNoticeContainer}>
                <Ionicons name="information-circle" size={40} color="#FFD60A" />
                <Text style={styles.webNoticeTitle}>Web Preview Mode</Text>
                <Text style={styles.webNoticeText}>
                  AI features require a native device. Redirecting to app preview...
                </Text>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkipToApp}
                >
                  <Text style={styles.skipButtonText}>Continue to App</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {error && !isWeb && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="cloud-offline" size={24} color="#8E8E93" />
            <Text style={styles.featureText}>Works in airplane mode</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark" size={24} color="#8E8E93" />
            <Text style={styles.featureText}>Complete privacy - no cloud</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="flash" size={24} color="#8E8E93" />
            <Text style={styles.featureText}>Instant AI-powered search</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 32,
  },
  progressText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#1C1C1E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  successText: {
    fontSize: 20,
    color: '#34C759',
    marginTop: 16,
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginVertical: 32,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  featureList: {
    marginTop: 48,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  webNoticeContainer: {
    alignItems: 'center',
    marginVertical: 32,
    padding: 24,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD60A40',
  },
  webNoticeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFD60A',
    marginTop: 16,
    marginBottom: 8,
  },
  webNoticeText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
