import { Stack } from 'expo-router';
import { CactusProvider } from '../src/contexts/CactusContext';
import { CactusSTTProvider } from '../src/contexts/CactusSTTContext';
import { useEffect, useState } from 'react';
import { initDatabase } from '../src/utils/database';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    init();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing app...</Text>
      </View>
    );
  }

  return (
    <CactusProvider>
      <CactusSTTProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </CactusSTTProvider>
    </CactusProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
});