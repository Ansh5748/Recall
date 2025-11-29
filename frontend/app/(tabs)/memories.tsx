import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllMemories, deleteMemory, clearAllMemories, updateMemory, updateMemoryEmbedding, Memory } from '../../src/utils/database';
import { useCactus } from '../../src/contexts/CactusContext';
import { useVoiceInput } from '../../src/hooks/useVoiceInput';

export default function MemoriesScreen() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeField, setActiveField] = useState<'item' | 'location' | 'notes' | null>(null);
  
  const { embed, isModelReady } = useCactus();
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceInput();
  const isFocused = useIsFocused();

  const loadMemories = async () => {
    try {
      const data = await getAllMemories();
      console.log('Loaded memories:', data);
      setMemories(data);
    } catch (error) {
      console.error('Error loading memories:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to load memories');
      } else {
        Alert.alert('Error', 'Failed to load memories');
      }
    }
  };

  // Load memories when screen is focused
  useEffect(() => {
    if (isFocused) {
      loadMemories();
    }
  }, [isFocused]);

  useFocusEffect(
    useCallback(() => {
      loadMemories();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMemories();
    setRefreshing(false);
  };

  const handleDelete = async (id: number) => {
    // Use window.confirm for web compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this memory?');
      if (confirmed) {
        try {
          await deleteMemory(id);
          await loadMemories();
        } catch (error) {
          window.alert('Failed to delete memory');
        }
      }
    } else {
      Alert.alert(
        'Delete Memory',
        'Are you sure you want to delete this memory?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteMemory(id);
                await loadMemories();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete memory');
              }
            },
          },
        ]
      );
    }
  };

  const handleEdit = (memory: Memory) => {
    setEditingMemory(memory);
    setEditItemName(memory.item_name);
    setEditLocation(memory.location);
    setEditNotes(memory.notes || '');
  };

  const handleVoiceInput = async (field: 'item' | 'location' | 'notes') => {
    if (isRecording) {
      const transcription = await stopRecording();
      setActiveField(null);
      
      if (transcription) {
        switch (field) {
          case 'item':
            setEditItemName(prev => prev ? `${prev} ${transcription}` : transcription);
            break;
          case 'location':
            setEditLocation(prev => prev ? `${prev} ${transcription}` : transcription);
            break;
          case 'notes':
            setEditNotes(prev => prev ? `${prev} ${transcription}` : transcription);
            break;
        }
      }
    } else {
      setActiveField(field);
      await startRecording();
    }
  };

  const handleSaveEdit = async () => {
    if (!editItemName.trim() || !editLocation.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Please enter both item name and location.');
      } else {
        Alert.alert('Missing Information', 'Please enter both item name and location.');
      }
      return;
    }

    setSaving(true);

    try {
      const memoryData = {
        item_name: editItemName.trim(),
        location: editLocation.trim(),
        notes: editNotes.trim() || undefined,
      };

      // Generate new embedding
      let embeddingString = undefined;
      if (isModelReady) {
        const text = `${editItemName} ${editLocation} ${editNotes}`.trim();
        const embedding = await embed(text);
        if (embedding) {
          embeddingString = JSON.stringify(embedding);
        }
      }

      await updateMemory(editingMemory!.id!, {
        ...memoryData,
        embedding: embeddingString,
      });

      setEditingMemory(null);
      await loadMemories();
      
      if (Platform.OS === 'web') {
        window.alert('Memory updated successfully!');
      } else {
        Alert.alert('Success', 'Memory updated successfully!');
      }
    } catch (error) {
      console.error('Error updating memory:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to update memory');
      } else {
        Alert.alert('Error', 'Failed to update memory');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    // Use window.confirm for web compatibility
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete all memories? This cannot be undone.');
      if (confirmed) {
        try {
          await clearAllMemories();
          await loadMemories();
        } catch (error) {
          window.alert('Failed to clear memories');
        }
      }
    } else {
      Alert.alert(
        'Clear All Memories',
        'Are you sure you want to delete all memories? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: async () => {
              try {
                await clearAllMemories();
                await loadMemories();
              } catch (error) {
                Alert.alert('Error', 'Failed to clear memories');
              }
            },
          },
        ]
      );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVoiceButtonColor = (field: 'item' | 'location' | 'notes') => {
    if (activeField === field && isRecording) return '#FF3B30';
    if (isTranscribing) return '#8E8E93';
    return '#007AFF';
  };

  const renderItem = ({ item }: { item: Memory }) => (
    <View style={styles.memoryCard}>
      <View style={styles.memoryHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="cube-outline" size={24} color="#007AFF" />
        </View>
        <View style={styles.memoryContent}>
          <Text style={styles.itemName}>{item.item_name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#8E8E93" />
            <Text style={styles.location}>{item.location}</Text>
          </View>
          {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={styles.editButton}
            testID={`edit-button-${item.id}`}
            accessible={true}
            accessibilityLabel="Edit memory"
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id!)}
            style={styles.deleteButton}
            testID={`delete-button-${item.id}`}
            accessible={true}
            accessibilityLabel="Delete memory"
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="archive-outline" size={80} color="#8E8E93" />
      <Text style={styles.emptyTitle}>No memories yet</Text>
      <Text style={styles.emptyText}>
        Tap the + button to add your first memory
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Memories</Text>
        {memories.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={memories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={[
          styles.listContent,
          memories.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      />

      <Modal
        visible={editingMemory !== null}
        animationType="slide"
        onRequestClose={() => !saving && setEditingMemory(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Memory</Text>
            <TouchableOpacity
              onPress={() => setEditingMemory(null)}
              disabled={saving || isRecording || isTranscribing}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Name *</Text>
              <View style={styles.inputWithVoice}>
                <TextInput
                  style={styles.input}
                  value={editItemName}
                  onChangeText={setEditItemName}
                  placeholder="Item name"
                  placeholderTextColor="#636366"
                  editable={!isRecording && !isTranscribing && !saving}
                />
                <TouchableOpacity
                  style={[styles.voiceButton, { backgroundColor: getVoiceButtonColor('item') }]}
                  onPress={() => handleVoiceInput('item')}
                  disabled={isTranscribing || saving || (isRecording && activeField !== 'item')}
                >
                  <Ionicons 
                    name={activeField === 'item' && isRecording ? 'stop' : 'mic'} 
                    size={18} 
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
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="Location"
                  placeholderTextColor="#636366"
                  editable={!isRecording && !isTranscribing && !saving}
                />
                <TouchableOpacity
                  style={[styles.voiceButton, { backgroundColor: getVoiceButtonColor('location') }]}
                  onPress={() => handleVoiceInput('location')}
                  disabled={isTranscribing || saving || (isRecording && activeField !== 'location')}
                >
                  <Ionicons 
                    name={activeField === 'location' && isRecording ? 'stop' : 'mic'} 
                    size={18} 
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
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Additional details"
                  placeholderTextColor="#636366"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isRecording && !isTranscribing && !saving}
                />
                <TouchableOpacity
                  style={[styles.voiceButton, styles.voiceButtonTop, { backgroundColor: getVoiceButtonColor('notes') }]}
                  onPress={() => handleVoiceInput('notes')}
                  disabled={isTranscribing || saving || (isRecording && activeField !== 'notes')}
                >
                  <Ionicons 
                    name={activeField === 'notes' && isRecording ? 'stop' : 'mic'} 
                    size={18} 
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
              style={[styles.saveButton, (saving || isRecording || isTranscribing) && styles.saveButtonDisabled]}
              onPress={handleSaveEdit}
              disabled={saving || isRecording || isTranscribing}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flex: 1,
  },
  memoryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memoryContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: 15,
    color: '#8E8E93',
    marginLeft: 4,
  },
  notes: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: '#636366',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
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
    paddingRight: 50,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginBottom: 20,
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
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});