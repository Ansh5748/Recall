import { Platform } from 'react-native';

// Conditionally import SQLite only on native platforms
let SQLite: any = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

export interface Memory {
  id?: number;
  item_name: string;
  location: string;
  notes?: string;
  embedding?: string; // JSON stringified array
  created_at?: string;
  updated_at?: string;
}

let db: any = null;

export const initDatabase = async (): Promise<any> => {
  if (Platform.OS === 'web') {
    console.warn('Database not available on web');
    return null;
  }
  
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('memories.db');
  
  // Create memories table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      location TEXT NOT NULL,
      notes TEXT,
      embedding TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_item_name ON memories(item_name);
    CREATE INDEX IF NOT EXISTS idx_created_at ON memories(created_at DESC);
  `);
  
  return db;
};

export const getDatabase = async (): Promise<any> => {
  if (Platform.OS === 'web') {
    console.warn('Database not available on web');
    return null;
  }
  
  if (!db) {
    return await initDatabase();
  }
  return db;
};

export const addMemory = async (memory: Memory): Promise<number> => {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO memories (item_name, location, notes, embedding) VALUES (?, ?, ?, ?)`,
    memory.item_name,
    memory.location,
    memory.notes || null,
    memory.embedding || null
  );
  return result.lastInsertRowId;
};

export const updateMemoryEmbedding = async (id: number, embedding: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE memories SET embedding = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    embedding,
    id
  );
};

export const updateMemory = async (id: number, memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE memories SET item_name = ?, location = ?, notes = ?, embedding = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    memory.item_name,
    memory.location,
    memory.notes || null,
    memory.embedding || null,
    id
  );
};

export const getAllMemories = async (): Promise<Memory[]> => {
  const database = await getDatabase();
  const result = await database.getAllAsync<Memory>(
    'SELECT * FROM memories ORDER BY created_at DESC'
  );
  return result;
};

export const searchMemories = async (searchText: string): Promise<Memory[]> => {
  const database = await getDatabase();
  const result = await database.getAllAsync<Memory>(
    `SELECT * FROM memories 
     WHERE item_name LIKE ? OR location LIKE ? OR notes LIKE ?
     ORDER BY created_at DESC`,
    `%${searchText}%`,
    `%${searchText}%`,
    `%${searchText}%`
  );
  return result;
};

export const getMemoriesWithEmbeddings = async (): Promise<Memory[]> => {
  const database = await getDatabase();
  const result = await database.getAllAsync<Memory>(
    'SELECT * FROM memories WHERE embedding IS NOT NULL ORDER BY created_at DESC'
  );
  return result;
};

export const deleteMemory = async (id: number): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM memories WHERE id = ?', id);
};

export const clearAllMemories = async (): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM memories');
};

// Utility function to calculate cosine similarity
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
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Find similar memories using embeddings
export const findSimilarMemories = async (
  queryEmbedding: number[],
  topK: number = 5
): Promise<Array<Memory & { similarity: number }>> => {
  const memories = await getMemoriesWithEmbeddings();
  
  const results = memories
    .map(memory => {
      if (!memory.embedding) return null;
      
      try {
        const memoryEmbedding = JSON.parse(memory.embedding);
        const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);
        return { ...memory, similarity };
      } catch {
        return null;
      }
    })
    .filter((item): item is Memory & { similarity: number } => item !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
  
  return results;
};