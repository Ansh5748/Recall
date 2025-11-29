import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useCactus } from '../../src/contexts/CactusContext';
import { useVoiceInput } from '../../src/hooks/useVoiceInput';
import { findSimilarMemories, Memory, searchMemories } from '../../src/utils/database';

interface SearchResult extends Memory {
  similarity?: number;
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'semantic' | 'text'>('semantic');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { embed, complete, isModelReady } = useCactus();
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceInput();

  const handleVoiceInput = async () => {
    if (isRecording) {
      const transcription = await stopRecording();
      if (transcription) {
        setQuery(transcription);
      }
    } else {
      await startRecording();
    }
  };

  const speakResponse = async (text: string) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(text, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    Keyboard.dismiss();
    setLoading(true);
    setResults([]);
    setAiResponse('');

    try {
      if (searchMode === 'semantic' && isModelReady) {
        // Semantic search using embeddings
        const queryEmbedding = await embed(query);
        
        if (queryEmbedding) {
          const similarMemories = await findSimilarMemories(queryEmbedding, 5);
          setResults(similarMemories);

          // Generate AI explanation
          if (similarMemories.length > 0) {
            const context = similarMemories
              .slice(0, 3)
              .map(m => `- ${m.item_name}: ${m.location}${m.notes ? ` (${m.notes})` : ''}`)
              .join('\n');
            
            const prompt = `Based on these stored memories:\n${context}\n\nQuestion: ${query}\n\nProvide a clear, helpful answer about where the item is located. Be concise and direct.`;
            
            const response = await complete(prompt);
            if (response) {
              setAiResponse(response);
            }
          } else {
            const noResultMessage = "I couldn't find any matching memories. Try adding the item first.";
            setAiResponse(noResultMessage);
          }
        }
      } else {
        // Fallback to text search
        const textResults = await searchMemories(query);
        setResults(textResults);
        
        if (textResults.length === 0) {
          setAiResponse("No memories found matching your search.");
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setAiResponse('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setAiResponse('');
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="search-outline" size={60} color="#007AFF" />
          <Text style={styles.title}>Find Your Things</Text>
          <Text style={styles.subtitle}>
            Ask naturally: "Where did I keep my passport?"
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Where did I keep my..."
              placeholderTextColor="#636366"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              editable={!isRecording && !isTranscribing}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.voiceButton,
                { backgroundColor: isRecording ? '#FF3B30' : '#007AFF' },
                { display: 'none' }
              ]}
              onPress={handleVoiceInput}
              disabled={isTranscribing}
            >
              <Ionicons 
                name={isRecording ? 'stop' : 'mic'} 
                size={18} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>

          {(isRecording || isTranscribing) && (
            <View style={styles.voiceStatusContainer}>
              {isRecording && (
                <>
                  <View style={styles.recordingIndicator} />
                  <Text style={styles.voiceStatusText}>Recording... Tap stop when done</Text>
                </>
              )}
              {isTranscribing && (
                <>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.voiceStatusText}>Transcribing...</Text>
                </>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.searchButtonText}>AI Search</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {aiResponse && (
          <View style={styles.aiResponseContainer}>
            <View style={styles.aiHeader}>
              <View style={styles.aiHeaderLeft}>
                <Ionicons name="bulb" size={20} color="#FFD60A" />
                <Text style={styles.aiHeaderText}>AI Answer</Text>
              </View>
              <TouchableOpacity 
                onPress={() => speakResponse(aiResponse)}
                style={styles.speakerButton}
              >
                <Ionicons 
                  name={isSpeaking ? 'stop-circle' : 'volume-high'} 
                  size={24} 
                  color={isSpeaking ? '#FF3B30' : '#007AFF'} 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.aiResponseText}>{aiResponse}</Text>
          </View>
        )}

        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              Found {results.length} {results.length === 1 ? 'memory' : 'memories'}
            </Text>
            {results.map((result) => (
              <View key={result.id} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultIconContainer}>
                    <Ionicons name="cube" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.resultContent}>
                    <Text style={styles.resultItemName}>{result.item_name}</Text>
                    <View style={styles.resultLocationRow}>
                      <Ionicons name="location" size={14} color="#8E8E93" />
                      <Text style={styles.resultLocation}>{result.location}</Text>
                    </View>
                    {result.notes && (
                      <Text style={styles.resultNotes}>{result.notes}</Text>
                    )}
                    {result.similarity !== undefined && (
                      <View style={styles.similarityBadge}>
                        <Text style={styles.similarityText}>
                          {Math.round(result.similarity * 100)}% match
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && query && results.length === 0 && !aiResponse && (
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={60} color="#8E8E93" />
            <Text style={styles.emptyText}>No memories found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search or add the item first
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    marginBottom: 12,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  voiceStatusText: {
    fontSize: 14,
    color: '#fff',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aiResponseContainer: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#FFD60A40',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD60A',
  },
  speakerButton: {
    padding: 4,
  },
  aiResponseText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  resultsContainer: {
    gap: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  resultCard: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  resultLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultLocation: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  resultNotes: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  similarityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#34C75920',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  similarityText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
});
