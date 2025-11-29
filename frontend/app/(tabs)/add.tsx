import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCactus } from '../../src/contexts/CactusContext';
import { useVoiceInput } from '../../src/hooks/useVoiceInput';
import { addMemory, updateMemoryEmbedding } from '../../src/utils/database';

export default function AddScreen() {
  const [itemName, setItemName] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState<'item' | 'location' | 'notes' | null>(null);
  
  const { embed, isModelReady } = useCactus();
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceInput();

  const handleVoiceInput = async (field: 'item' | 'location' | 'notes') => {
    if (isRecording) {
      // Stop recording
      const transcription = await stopRecording();
      setActiveField(null);
      
      if (transcription) {
        // Append to existing text
        switch (field) {
          case 'item':
            setItemName(prev => prev ? `${prev} ${transcription}` : transcription);
            break;
          case 'location':
            setLocation(prev => prev ? `${prev} ${transcription}` : transcription);
            break;
          case 'notes':
            setNotes(prev => prev ? `${prev} ${transcription}` : transcription);
            break;
        }
      }
    } else {
      // Start recording
      setActiveField(field);
      await startRecording();
    }
  };

  const handleSubmit = async () => {
    if (!itemName.trim() || !location.trim()) {
      Alert.alert('Missing Information', 'Please enter both item name and location.');
      return;
    }

    setLoading(true);

    try {
      // First, save the memory
      const memoryId = await addMemory({
        item_name: itemName.trim(),
        location: location.trim(),
        notes: notes.trim() || undefined,
      });

      // Generate embedding for semantic search
      if (isModelReady) {
        const text = `${itemName} ${location} ${notes}`.trim();
        const embedding = await embed(text);
        
        if (embedding) {
          await updateMemoryEmbedding(memoryId, JSON.stringify(embedding));
        }
      }

      // Clear form immediately after saving
      setItemName('');
      setLocation('');
      setNotes('');
      
      Alert.alert('Success', 'Memory saved successfully!');
    } catch (error) {
      console.error('Error saving memory:', error);
      Alert.alert('Error', 'Failed to save memory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getVoiceButtonColor = (field: 'item' | 'location' | 'notes') => {
    if (activeField === field && isRecording) return '#FF3B30';
    if (isTranscribing) return '#8E8E93';
    return '#007AFF';
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
          <Ionicons name="add-circle-outline" size={60} color="#007AFF" />
          <Text style={styles.title}>Add New Memory</Text>
          <Text style={styles.subtitle}>
            Store where you kept something
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <View style={styles.inputWithVoice}>
              <TextInput
                style={styles.input}
                placeholder="e.g., Passport, Keys, Charger"
                placeholderTextColor="#636366"
                value={itemName}
                onChangeText={setItemName}
                autoCapitalize="words"
                editable={!isRecording && !isTranscribing}
              />
              <TouchableOpacity
                style={[styles.voiceButton, { backgroundColor: getVoiceButtonColor('item') }]}
                onPress={() => handleVoiceInput('item')}
                disabled={isTranscribing || (isRecording && activeField !== 'item')}
              >
                <Ionicons 
                  name={activeField === 'item' && isRecording ? 'stop' : 'mic'} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <View style={styles.inputWithVoice}>
              <TextInput
                style={styles.input}
                placeholder="e.g., Blue bag, top drawer"
                placeholderTextColor="#636366"
                value={location}
                onChangeText={setLocation}
                autoCapitalize="sentences"
                editable={!isRecording && !isTranscribing}
              />
              <TouchableOpacity
                style={[styles.voiceButton, { backgroundColor: getVoiceButtonColor('location') }]}
                onPress={() => handleVoiceInput('location')}
                disabled={isTranscribing || (isRecording && activeField !== 'location')}
              >
                <Ionicons 
                  name={activeField === 'location' && isRecording ? 'stop' : 'mic'} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <View style={styles.inputWithVoice}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional details..."
                placeholderTextColor="#636366"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoCapitalize="sentences"
                editable={!isRecording && !isTranscribing}
              />
              <TouchableOpacity
                style={[styles.voiceButton, styles.voiceButtonTop, { backgroundColor: getVoiceButtonColor('notes') }]}
                onPress={() => handleVoiceInput('notes')}
                disabled={isTranscribing || (isRecording && activeField !== 'notes')}
              >
                <Ionicons 
                  name={activeField === 'notes' && isRecording ? 'stop' : 'mic'} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {(isRecording || isTranscribing) && (
            <View style={styles.statusContainer}>
              {isRecording && (
                <>
                  <View style={styles.recordingIndicator} />
                  <Text style={styles.statusText}>Recording... Tap stop when done</Text>
                </>
              )}
              {isTranscribing && (
                <>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.statusText}>Transcribing...</Text>
                </>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || isRecording || isTranscribing) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || isRecording || isTranscribing}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Save Memory</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Your data is stored locally and never leaves your device.
            </Text>
          </View>
        </View>
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
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  inputWithVoice: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    paddingRight: 56,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  voiceButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonTop: {
    top: 8,
    bottom: 'auto',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF20',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 18,
  },
});
