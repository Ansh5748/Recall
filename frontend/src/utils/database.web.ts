// Web implementation using localStorage for demo purposes
// In production native app, this will use SQLite

export interface Memory {
  id?: number;
  item_name: string;
  location: string;
  notes?: string;
  embedding?: string;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = 'memories_app_data';

const getStoredMemories = (): Memory[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};

const saveMemories = (memories: Memory[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const initDatabase = async (): Promise<any> => {
  console.log('Web storage initialized using localStorage');
  return Promise.resolve(null);
};

export const getDatabase = async (): Promise<any> => {
  return Promise.resolve(null);
};

export const addMemory = async (memory: Memory): Promise<number> => {
  const memories = getStoredMemories();
  const newId = memories.length > 0 ? Math.max(...memories.map(m => m.id || 0)) + 1 : 1;
  const now = new Date().toISOString();
  
  const newMemory: Memory = {
    ...memory,
    id: newId,
    created_at: now,
    updated_at: now,
  };
  
  memories.push(newMemory);
  saveMemories(memories);
  console.log('Memory added:', newMemory);
  return newId;
};

export const updateMemoryEmbedding = async (id: number, embedding: string): Promise<void> => {
  const memories = getStoredMemories();
  const index = memories.findIndex(m => m.id === id);
  
  if (index !== -1) {
    memories[index].embedding = embedding;
    memories[index].updated_at = new Date().toISOString();
    saveMemories(memories);
    console.log('Memory embedding updated:', id);
  }
};

export const getAllMemories = async (): Promise<Memory[]> => {
  return getStoredMemories().sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA; // newest first
  });
};

export const searchMemories = async (searchText: string): Promise<Memory[]> => {
  const memories = getStoredMemories();
  const query = searchText.toLowerCase();
  
  return memories.filter(m => 
    m.item_name.toLowerCase().includes(query) ||
    m.location.toLowerCase().includes(query) ||
    (m.notes && m.notes.toLowerCase().includes(query))
  );
};

export const getMemoriesWithEmbeddings = async (): Promise<Memory[]> => {
  const memories = getStoredMemories();
  return memories.filter(m => m.embedding);
};

export const deleteMemory = async (id: number): Promise<void> => {
  const memories = getStoredMemories();
  const filtered = memories.filter(m => m.id !== id);
  saveMemories(filtered);
  console.log('Memory deleted:', id);
};

export const clearAllMemories = async (): Promise<void> => {
  saveMemories([]);
  console.log('All memories cleared');
};

export const updateMemory = async (id: number, updates: Partial<Memory>): Promise<void> => {
  const memories = getStoredMemories();
  const index = memories.findIndex(m => m.id === id);
  
  if (index !== -1) {
    memories[index] = {
      ...memories[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveMemories(memories);
    console.log('Memory updated:', id);
  }
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
};

export const findSimilarMemories = async (
  queryEmbedding: number[],
  topK: number = 5
): Promise<Array<Memory & { similarity: number }>> => {
  const memories = await getMemoriesWithEmbeddings();
  
  const memoriesWithSimilarity = memories
    .map(memory => {
      if (!memory.embedding) return null;
      
      const embedding = JSON.parse(memory.embedding);
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      
      return {
        ...memory,
        similarity,
      };
    })
    .filter((m): m is Memory & { similarity: number } => m !== null && m.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
  
  return memoriesWithSimilarity;
};
