/**
 * Comprehensive unit tests for Coordination System
 * Tests the CoordinationManager with its actual API
 */

import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import { CoordinationManager } from '../../../src/coordination/manager.js';
import { ConflictResolver } from '../../../src/coordination/conflict-resolution.js';
import { CircuitBreaker, CircuitState } from '../../../src/coordination/circuit-breaker.js';
import type { CoordinationConfig, Task } from '../../../src/utils/types.js';
import { createMocks } from '../../mocks/index.js';

describe('Coordination System - Comprehensive Tests', () => {
  let coordinationManager: CoordinationManager;
  let mocks: ReturnType<typeof createMocks>;
  let config: CoordinationConfig;

  beforeEach(() => {
    mocks = createMocks();

    config = {
      maxRetries: 3,
      retryDelay: 100,
      deadlockDetection: false,
      resourceTimeout: 5000,
      messageTimeout: 5000,
    };

    coordinationManager = new CoordinationManager(
      config,
      mocks.eventBus,
      mocks.logger
    );
  });

  afterEach(async () => {
    try {
      await coordinationManager.shutdown();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await coordinationManager.initialize();

      const health = await coordinationManager.getHealthStatus();
      expect(health.healthy).toBe(true);
    });

    it('should not initialize twice', async () => {
      await coordinationManager.initialize();
      await coordinationManager.initialize(); // Should not throw

      const health = await coordinationManager.getHealthStatus();
      expect(health.healthy).toBe(true);
    });
  });

  describe('Task Management', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should assign task to agent', async () => {
      const task: Task = {
        id: 'test-task-1',
        type: 'test',
        description: 'Test task',
        priority: 50,
        status: 'pending',
        dependencies: [],
        input: {},
        metadata: {},
        createdAt: new Date(),
      };
      const agentId = 'test-agent';

      await coordinationManager.assignTask(task, agentId);

      const taskCount = await coordinationManager.getAgentTaskCount(agentId);
      expect(taskCount).toBe(1);
    });

    it('should get agent tasks', async () => {
      const task: Task = {
        id: 'test-task-2',
        type: 'test',
        description: 'Test task 2',
        priority: 50,
        status: 'pending',
        dependencies: [],
        input: {},
        metadata: {},
        createdAt: new Date(),
      };
      const agentId = 'test-agent';

      await coordinationManager.assignTask(task, agentId);

      const tasks = await coordinationManager.getAgentTasks(agentId);
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(task.id);
    });

    it('should cancel task', async () => {
      const task: Task = {
        id: 'test-task-3',
        type: 'test',
        description: 'Test task 3',
        priority: 50,
        status: 'pending',
        dependencies: [],
        input: {},
        metadata: {},
        createdAt: new Date(),
      };
      const agentId = 'test-agent';

      await coordinationManager.assignTask(task, agentId);
      await coordinationManager.cancelTask(task.id);

      const taskCount = await coordinationManager.getAgentTaskCount(agentId);
      expect(taskCount).toBe(0);
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should acquire and release resource', async () => {
      const resourceId = 'test-resource';
      const agentId = 'test-agent';

      await coordinationManager.acquireResource(resourceId, agentId);
      await coordinationManager.releaseResource(resourceId, agentId);

      // Should not throw - resource was successfully acquired and released
    });
  });

  describe('Messaging', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should send message between agents', async () => {
      const from = 'agent-1';
      const to = 'agent-2';
      const message = { type: 'test', data: 'hello' };

      await coordinationManager.sendMessage(from, to, message);

      // Message should be sent without error
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should return healthy status', async () => {
      const health = await coordinationManager.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.metrics).toBeDefined();
    });

    it('should get coordination metrics', async () => {
      const metrics = await coordinationManager.getCoordinationMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.conflicts).toBeDefined();
    });
  });

  describe('Maintenance', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should perform maintenance', async () => {
      await coordinationManager.performMaintenance();

      // Should complete without error
    });
  });

  describe('Advanced Scheduling', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should enable advanced scheduling', () => {
      coordinationManager.enableAdvancedScheduling();

      // Should not throw
    });
  });

  describe('Conflict Reporting', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should report resource conflict', async () => {
      await coordinationManager.reportConflict('resource', 'resource-1', ['agent-1', 'agent-2']);

      // Should complete without error
    });

    it('should report task conflict', async () => {
      await coordinationManager.reportConflict('task', 'task-1', ['agent-1', 'agent-2']);

      // Should complete without error
    });
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
    resolver = new ConflictResolver(mocks.logger, mocks.eventBus);
  });

  it('should report resource conflict', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);

    expect(conflict.id).toBeDefined();
    expect(conflict.resourceId).toBe('resource-1');
    expect(conflict.agents).toEqual(['agent-1', 'agent-2']);
    expect(conflict.resolved).toBe(false);
  });

  it('should report task conflict', async () => {
    const conflict = await resolver.reportTaskConflict(
      'task-1',
      ['agent-1', 'agent-2'],
      'assignment'
    );

    expect(conflict.id).toBeDefined();
    expect(conflict.taskId).toBe('task-1');
    expect(conflict.type).toBe('assignment');
    expect(conflict.resolved).toBe(false);
  });

  it('should resolve conflict using priority strategy', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);

    const context = {
      agentPriorities: new Map([
        ['agent-1', 5],
        ['agent-2', 10],
      ]),
    };

    const resolution = await resolver.resolveConflict(conflict.id, 'priority', context);

    expect(resolution.type).toBe('priority');
    expect(resolution.winner).toBe('agent-2'); // Higher priority
    expect(conflict.resolved).toBe(true);
  });

  it('should resolve conflict using timestamp strategy', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);

    const now = new Date();
    const context = {
      requestTimestamps: new Map([
        ['agent-1', new Date(now.getTime() - 1000)], // Earlier
        ['agent-2', now],
      ]),
    };

    const resolution = await resolver.resolveConflict(conflict.id, 'timestamp', context);

    expect(resolution.type).toBe('timestamp');
    expect(resolution.winner).toBe('agent-1'); // Earlier request
  });

  it('should auto-resolve conflicts', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);

    const resolution = await resolver.autoResolve(conflict.id, 'priority');

    expect(resolution.type).toBe('priority');
    expect(resolution.winner).toBeDefined();
  });

  it('should track conflict statistics', async () => {
    await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);
    await resolver.reportTaskConflict('task-1', ['agent-1', 'agent-2'], 'assignment');

    const stats = resolver.getStats();

    expect(stats.totalConflicts).toBe(2);
    expect(stats.activeConflicts).toBe(2);
    expect(stats.resolvedConflicts).toBe(0);
    expect(stats.conflictsByType.resource).toBe(1);
    expect(stats.conflictsByType.task).toBe(1);
  });

  it('should cleanup old conflicts', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);

    // Resolve the conflict
    await resolver.autoResolve(conflict.id);

    // Cleanup old conflicts (use -1 since the method uses > not >=)
    const removed = resolver.cleanupOldConflicts(-1);

    expect(removed).toBe(1);
  });

  it('should get active conflicts', async () => {
    await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);
    await resolver.reportResourceConflict('resource-2', ['agent-3', 'agent-4']);

    const active = resolver.getActiveConflicts();

    expect(active.length).toBe(2);
  });
});

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  let mocks: ReturnType<typeof createMocks>;
  let circuitConfig: {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    halfOpenLimit: number;
  };

  beforeEach(() => {
    mocks = createMocks();

    circuitConfig = {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      halfOpenLimit: 1,
    };

    breaker = new CircuitBreaker('test-breaker', circuitConfig, mocks.logger);
  });

  it('should start in closed state', () => {
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute function successfully', async () => {
    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
  });

  it('should open after failure threshold', async () => {
    const failingFn = async () => { throw new Error('failure'); };

    // Cause failures
    for (let i = 0; i < circuitConfig.failureThreshold; i++) {
      try {
        await breaker.execute(failingFn);
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reject requests when open', async () => {
    // Force open state
    breaker.forceState(CircuitState.OPEN);

    await expect(breaker.execute(async () => 'success')).rejects.toThrow(
      "Circuit breaker 'test-breaker' is OPEN"
    );
  });

  it('should track metrics', () => {
    const metrics = breaker.getMetrics();

    expect(metrics.state).toBeDefined();
    expect(metrics.failures).toBe(0);
    expect(metrics.successes).toBe(0);
    expect(metrics.totalRequests).toBe(0);
  });
});
