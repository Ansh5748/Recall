import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useCactus } from '../src/contexts/CactusContext';

export default function Index() {
  const router = useRouter();
  const { isModelDownloaded } = useCactus();

  useEffect(() => {
    // Small delay to ensure proper navigation
    const timer = setTimeout(() => {
      if (isModelDownloaded) {
        router.replace('/(tabs)/memories');
      } else {
        router.replace('/download');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isModelDownloaded]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
