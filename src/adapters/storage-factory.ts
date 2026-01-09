/**
 * Storage Factory - Unified interface for tiara storage backends.
 *
 * Provides a consistent API regardless of whether SQLite or Qdrant is used.
 * This allows gradual migration from SQLite to Qdrant.
 */

import { QdrantCoordinationAdapter, QdrantConfig, DEFAULT_QDRANT_CONFIG } from './qdrant-adapter.js';
import type {
  SwarmRecord,
  AgentRecord,
  TaskRecord,
  MetricRecord,
  EventRecord,
} from '../api/database-service.js';

// =============================================================================
// Storage Interface
// =============================================================================

/**
 * Unified storage interface implemented by both SQLite and Qdrant backends.
 */
export interface StorageBackend {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Swarm operations
  createSwarm(swarm: Omit<SwarmRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  getSwarm(id: string): Promise<SwarmRecord | null>;
  updateSwarmStatus(id: string, status: SwarmRecord['status']): Promise<void>;
  deleteSwarm(id: string): Promise<void>;
  listSwarms(status?: SwarmRecord['status']): Promise<SwarmRecord[]>;

  // Agent operations
  createAgent(agent: Omit<AgentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  getAgent(id: string): Promise<AgentRecord | null>;
  updateAgentStatus(id: string, status: AgentRecord['status']): Promise<void>;
  getAgentsBySwarm(swarmId: string): Promise<AgentRecord[]>;
  deleteAgent(id: string): Promise<void>;

  // Task operations
  createTask(task: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  getTask(id: string): Promise<TaskRecord | null>;
  updateTaskStatus(id: string, status: TaskRecord['status'], result?: unknown, errorMessage?: string): Promise<void>;
  getTasksBySwarm(swarmId: string, status?: TaskRecord['status']): Promise<TaskRecord[]>;
  deleteTask(id: string): Promise<void>;

  // Event logging
  logEvent(event: Omit<EventRecord, 'id' | 'createdAt'>): Promise<string>;
  getEvents(filters: {
    swarmId?: string;
    agentId?: string;
    severity?: EventRecord['severity'];
    eventType?: string;
    since?: Date;
  }, limit?: number): Promise<EventRecord[]>;

  // Metrics
  recordMetric(metric: Omit<MetricRecord, 'id' | 'timestamp'>): Promise<string>;
  getMetrics(filters: {
    swarmId?: string;
    agentId?: string;
    metricType?: string;
    since?: Date;
  }, limit?: number): Promise<MetricRecord[]>;

  // Memory (key-value)
  memoryStore(key: string, value: string, namespace?: string, options?: { ttl?: number; metadata?: Record<string, unknown> }): Promise<void>;
  memoryGet(key: string, namespace?: string): Promise<{ value: string; metadata?: Record<string, unknown> } | null>;
  memoryDelete(key: string, namespace?: string): Promise<void>;
  memoryList(namespace?: string, limit?: number): Promise<Array<{ key: string; value: string; namespace: string }>>;

  // Maintenance
  cleanup(): Promise<{ expired: number; oldEvents: number }>;
}

// =============================================================================
// Storage Configuration
// =============================================================================

export type StorageType = 'sqlite' | 'qdrant' | 'hybrid';

export interface StorageConfig {
  type: StorageType;
  sqlite?: {
    path: string;
  };
  qdrant?: Partial<QdrantConfig>;
}

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  type: 'sqlite',
  sqlite: {
    path: '.swarm/memory.db',
  },
};

// =============================================================================
// Qdrant Backend Wrapper
// =============================================================================

/**
 * Wraps QdrantCoordinationAdapter to implement StorageBackend interface.
 */
class QdrantStorageBackend implements StorageBackend {
  private adapter: QdrantCoordinationAdapter;

  constructor(config?: Partial<QdrantConfig>) {
    this.adapter = new QdrantCoordinationAdapter(config);
  }

  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  async shutdown(): Promise<void> {
    // Qdrant adapter is stateless, nothing to shut down
  }

  async createSwarm(swarm: Omit<SwarmRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.adapter.createSwarm(swarm);
  }

  async getSwarm(id: string): Promise<SwarmRecord | null> {
    return this.adapter.getSwarm(id);
  }

  async updateSwarmStatus(id: string, status: SwarmRecord['status']): Promise<void> {
    return this.adapter.updateSwarmStatus(id, status);
  }

  async deleteSwarm(id: string): Promise<void> {
    return this.adapter.deleteSwarm(id);
  }

  async listSwarms(status?: SwarmRecord['status']): Promise<SwarmRecord[]> {
    return this.adapter.listSwarms(status);
  }

  async createAgent(agent: Omit<AgentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.adapter.createAgent(agent);
  }

  async getAgent(id: string): Promise<AgentRecord | null> {
    return this.adapter.getAgent(id);
  }

  async updateAgentStatus(id: string, status: AgentRecord['status']): Promise<void> {
    return this.adapter.updateAgentStatus(id, status);
  }

  async getAgentsBySwarm(swarmId: string): Promise<AgentRecord[]> {
    return this.adapter.getAgentsBySwarm(swarmId);
  }

  async deleteAgent(id: string): Promise<void> {
    return this.adapter.deleteAgent(id);
  }

  async createTask(task: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.adapter.createTask(task);
  }

  async getTask(id: string): Promise<TaskRecord | null> {
    return this.adapter.getTask(id);
  }

  async updateTaskStatus(id: string, status: TaskRecord['status'], result?: unknown, errorMessage?: string): Promise<void> {
    return this.adapter.updateTaskStatus(id, status, result, errorMessage);
  }

  async getTasksBySwarm(swarmId: string, status?: TaskRecord['status']): Promise<TaskRecord[]> {
    return this.adapter.getTasksBySwarm(swarmId, status);
  }

  async deleteTask(id: string): Promise<void> {
    return this.adapter.deleteTask(id);
  }

  async logEvent(event: Omit<EventRecord, 'id' | 'createdAt'>): Promise<string> {
    return this.adapter.logEvent(event);
  }

  async getEvents(filters: {
    swarmId?: string;
    agentId?: string;
    severity?: EventRecord['severity'];
    eventType?: string;
    since?: Date;
  }, limit = 100): Promise<EventRecord[]> {
    return this.adapter.getEvents(filters, limit);
  }

  async recordMetric(metric: Omit<MetricRecord, 'id' | 'timestamp'>): Promise<string> {
    return this.adapter.recordMetric(metric);
  }

  async getMetrics(filters: {
    swarmId?: string;
    agentId?: string;
    metricType?: string;
    since?: Date;
  }, limit = 100): Promise<MetricRecord[]> {
    return this.adapter.getMetrics(filters, limit);
  }

  async memoryStore(key: string, value: string, namespace = 'default', options?: { ttl?: number; metadata?: Record<string, unknown> }): Promise<void> {
    return this.adapter.memoryStore(key, value, namespace, options);
  }

  async memoryGet(key: string, namespace = 'default'): Promise<{ value: string; metadata?: Record<string, unknown> } | null> {
    const entry = await this.adapter.memoryGet(key, namespace);
    if (!entry) return null;
    return { value: entry.value, metadata: entry.metadata };
  }

  async memoryDelete(key: string, namespace = 'default'): Promise<void> {
    return this.adapter.memoryDelete(key, namespace);
  }

  async memoryList(namespace = 'default', limit = 100): Promise<Array<{ key: string; value: string; namespace: string }>> {
    const entries = await this.adapter.memoryList(namespace, limit);
    return entries.map(e => ({ key: e.key, value: e.value, namespace: e.namespace }));
  }

  async cleanup(): Promise<{ expired: number; oldEvents: number }> {
    return this.adapter.cleanup();
  }
}

// =============================================================================
// Factory
// =============================================================================

let _storage: StorageBackend | null = null;

/**
 * Get the configured storage backend.
 * Creates a singleton instance based on configuration.
 */
export async function getStorage(config?: StorageConfig): Promise<StorageBackend> {
  if (_storage) {
    return _storage;
  }

  const finalConfig = config ?? getConfigFromEnv();

  switch (finalConfig.type) {
    case 'qdrant':
      _storage = new QdrantStorageBackend(finalConfig.qdrant);
      break;

    case 'hybrid':
      // In hybrid mode, use Qdrant but fall back to SQLite for missing data
      // For now, just use Qdrant
      console.warn('Hybrid mode not fully implemented, using Qdrant');
      _storage = new QdrantStorageBackend(finalConfig.qdrant);
      break;

    case 'sqlite':
    default:
      // SQLite backend would need to be implemented here
      // For now, throw an error to encourage Qdrant adoption
      throw new Error(
        'SQLite backend not available through storage factory. ' +
        'Use the legacy DatabaseService directly or migrate to Qdrant.'
      );
  }

  await _storage.initialize();
  return _storage;
}

/**
 * Reset the storage singleton (useful for testing).
 */
export async function resetStorage(): Promise<void> {
  if (_storage) {
    await _storage.shutdown();
    _storage = null;
  }
}

/**
 * Get storage configuration from environment variables.
 */
function getConfigFromEnv(): StorageConfig {
  const type = (process.env.TIARA_STORAGE_TYPE ?? 'sqlite') as StorageType;

  return {
    type,
    sqlite: {
      path: process.env.TIARA_SQLITE_PATH ?? '.swarm/memory.db',
    },
    qdrant: {
      url: process.env.TIARA_QDRANT_URL ?? DEFAULT_QDRANT_CONFIG.url,
      apiKey: process.env.TIARA_QDRANT_API_KEY,
      collections: {
        coordination: process.env.TIARA_QDRANT_COORDINATION_COLLECTION ?? DEFAULT_QDRANT_CONFIG.collections.coordination,
        events: process.env.TIARA_QDRANT_EVENTS_COLLECTION ?? DEFAULT_QDRANT_CONFIG.collections.events,
        patterns: process.env.TIARA_QDRANT_PATTERNS_COLLECTION ?? DEFAULT_QDRANT_CONFIG.collections.patterns,
        memory: process.env.TIARA_QDRANT_MEMORY_COLLECTION ?? DEFAULT_QDRANT_CONFIG.collections.memory,
      },
      embeddingDimension: parseInt(process.env.TIARA_EMBEDDING_DIMENSION ?? '384', 10),
    },
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  QdrantStorageBackend,
  QdrantCoordinationAdapter,
  QdrantConfig,
  DEFAULT_QDRANT_CONFIG,
};
