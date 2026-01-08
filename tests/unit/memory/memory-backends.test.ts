/**
 * Unit tests for Memory System
 * Tests the MemoryManager and related components
 */

import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import { MemoryManager } from '../../../src/memory/manager.js';
import { MemoryCache } from '../../../src/memory/cache.js';
import type { MemoryConfig, MemoryEntry } from '../../../src/utils/types.js';
import { createMocks } from '../../mocks/index.js';

// Helper to create memory entries matching the actual MemoryEntry interface
const createMemoryEntry = (overrides: Partial<MemoryEntry> = {}): MemoryEntry => ({
  id: `entry-${Math.random().toString(36).substr(2, 9)}`,
  agentId: 'test-agent',
  sessionId: 'test-session',
  type: 'observation',
  content: 'Test content',
  context: {},
  timestamp: new Date(),
  tags: ['test'],
  version: 1,
  metadata: {},
  ...overrides,
});

describe('MemoryManager', () => {
  let manager: MemoryManager;
  let mocks: ReturnType<typeof createMocks>;
  let config: MemoryConfig;

  beforeEach(() => {
    mocks = createMocks();

    config = {
      backend: 'sqlite',
      cacheSizeMB: 10,
      syncInterval: 5000,
      conflictResolution: 'last-write',
      retentionDays: 1,
      sqlitePath: ':memory:',
      markdownDir: '/tmp/tiara-test-memory',
    };

    manager = new MemoryManager(config, mocks.eventBus, mocks.logger);
  });

  afterEach(async () => {
    try {
      await manager.shutdown();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await manager.initialize();

      expect(mocks.logger.info).toHaveBeenCalledWith('Initializing memory manager...');
    });

    it('should not initialize twice', async () => {
      await manager.initialize();
      await manager.initialize(); // Should not throw

      // Logger should only be called once for initialization
    });
  });

  describe('Bank Management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should create a memory bank', async () => {
      const bankId = await manager.createBank('test-agent');

      expect(bankId).toBeDefined();
      expect(typeof bankId).toBe('string');
    });

    it('should close a memory bank', async () => {
      const bankId = await manager.createBank('test-agent');

      await manager.closeBank(bankId);

      // Should complete without error
    });
  });

  describe('Entry Operations', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should store a memory entry', async () => {
      const entry = createMemoryEntry();

      await manager.store(entry);

      // Should complete without error
    });

    it('should retrieve a memory entry', async () => {
      const entry = createMemoryEntry();

      await manager.store(entry);
      const retrieved = await manager.retrieve(entry.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(entry.id);
    });

    it('should update a memory entry', async () => {
      const entry = createMemoryEntry();

      await manager.store(entry);
      await manager.update(entry.id, { content: 'Updated content' });

      const retrieved = await manager.retrieve(entry.id);
      expect(retrieved?.content).toBe('Updated content');
    });

    it('should delete a memory entry', async () => {
      const entry = createMemoryEntry();

      await manager.store(entry);
      await manager.delete(entry.id);

      const retrieved = await manager.retrieve(entry.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should query entries by agent', async () => {
      const entry1 = createMemoryEntry({ agentId: 'agent-1' });
      const entry2 = createMemoryEntry({ agentId: 'agent-2' });

      await manager.store(entry1);
      await manager.store(entry2);

      const results = await manager.query({ agentId: 'agent-1' });

      expect(results.length).toBe(1);
      expect(results[0].agentId).toBe('agent-1');
    });

    it('should query entries by tags', async () => {
      const entry1 = createMemoryEntry({ tags: ['important'] });
      const entry2 = createMemoryEntry({ tags: ['regular'] });

      await manager.store(entry1);
      await manager.store(entry2);

      const results = await manager.query({ tags: ['important'] });

      expect(results.length).toBe(1);
      expect(results[0].tags).toContain('important');
    });

    it('should query entries by type', async () => {
      const entry1 = createMemoryEntry({ type: 'observation' });
      const entry2 = createMemoryEntry({ type: 'insight' });

      await manager.store(entry1);
      await manager.store(entry2);

      const results = await manager.query({ type: 'observation' });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('observation');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should return healthy status', async () => {
      const health = await manager.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.metrics).toBeDefined();
    });
  });

  describe('Maintenance', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should perform maintenance', async () => {
      await manager.performMaintenance();

      // Should complete without error
    });
  });
});

describe('MemoryCache', () => {
  let cache: MemoryCache;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
    cache = new MemoryCache(1024 * 1024, mocks.logger); // 1MB cache
  });

  it('should store and retrieve entries', () => {
    const entry = createMemoryEntry();

    cache.set(entry.id, entry);
    const retrieved = cache.get(entry.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(entry.id);
  });

  it('should return undefined for missing entries', () => {
    const retrieved = cache.get('non-existent-id');

    expect(retrieved).toBeUndefined();
  });

  it('should delete entries', () => {
    const entry = createMemoryEntry();

    cache.set(entry.id, entry);
    cache.delete(entry.id);

    const retrieved = cache.get(entry.id);
    expect(retrieved).toBeUndefined();
  });

  it('should clear all entries', () => {
    const entry1 = createMemoryEntry();
    const entry2 = createMemoryEntry();

    cache.set(entry1.id, entry1);
    cache.set(entry2.id, entry2);
    cache.clear();

    expect(cache.get(entry1.id)).toBeUndefined();
    expect(cache.get(entry2.id)).toBeUndefined();
  });

  it('should report metrics', () => {
    const entry = createMemoryEntry();

    cache.set(entry.id, entry);
    cache.get(entry.id);      // hit
    cache.get('non-existent'); // miss

    const metrics = cache.getMetrics();

    // 1 hit / 2 total = 0.5 hit rate
    expect(metrics.hitRate).toBe(0.5);
    expect(metrics.entries).toBe(1);
    expect(metrics.size).toBeGreaterThan(0);
  });
});
