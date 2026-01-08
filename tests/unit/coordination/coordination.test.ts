/**
 * Unit tests for coordination system
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { CoordinationManager } from '../../../src/coordination/manager.js';
import { WorkStealingCoordinator } from '../../../src/coordination/work-stealing.js';
import { DependencyGraph } from '../../../src/coordination/dependency-graph.js';
import { CircuitBreaker, CircuitState } from '../../../src/coordination/circuit-breaker.js';
import { ConflictResolver } from '../../../src/coordination/conflict-resolution.js';
import type { CoordinationConfig, Task } from '../../../src/utils/types.js';
import { createMocks } from '../../mocks/index.js';

// Test data builder helper
const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random().toString(36).substr(2, 9)}`,
  type: 'test',
  description: 'Test task',
  priority: 50,
  status: 'pending',
  dependencies: [],
  input: {},
  metadata: {},
  createdAt: new Date(),
  ...overrides,
});

const createAgentProfile = (overrides: any = {}) => ({
  id: `agent-${Math.random().toString(36).substr(2, 9)}`,
  type: 'worker',
  capabilities: ['test'],
  maxConcurrentTasks: 5,
  priority: 5,
  ...overrides,
});

describe('CoordinationManager', () => {
  let manager: CoordinationManager;
  let mocks: ReturnType<typeof createMocks>;
  let config: CoordinationConfig;

  beforeEach(() => {
    jest.useFakeTimers();

    config = {
      maxRetries: 3,
      retryDelay: 100,
      deadlockDetection: false,
      resourceTimeout: 5000,
      messageTimeout: 5000,
    };

    mocks = createMocks();

    manager = new CoordinationManager(
      config,
      mocks.eventBus,
      mocks.logger,
    );
  });

  afterEach(async () => {
    jest.useRealTimers();
    try {
      await manager.shutdown();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should initialize all components', async () => {
      await manager.initialize();

      expect(mocks.logger.info).toHaveBeenCalledWith('Coordination manager initialized');
    });

    it('should start deadlock detection if enabled', async () => {
      config.deadlockDetection = true;
      manager = new CoordinationManager(config, mocks.eventBus, mocks.logger);

      await manager.initialize();

      // Fast forward to trigger deadlock detection
      jest.advanceTimersByTime(10000);

      // No deadlock errors expected
      expect(mocks.logger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('deadlock'),
        expect.anything()
      );
    });

    it('should not initialize twice', async () => {
      await manager.initialize();
      await manager.initialize(); // Should not throw

      expect(mocks.logger.info).toHaveBeenCalledWith('Coordination manager initialized');
    });
  });

  describe('task management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should assign task to agent', async () => {
      const task = createTask();
      const agentId = 'test-agent';

      await manager.assignTask(task, agentId);

      const taskCount = await manager.getAgentTaskCount(agentId);
      expect(taskCount).toBe(1);
    });

    it('should get agent tasks', async () => {
      const task = createTask();
      const agentId = 'test-agent';

      await manager.assignTask(task, agentId);

      const tasks = await manager.getAgentTasks(agentId);
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(task.id);
    });

    it('should cancel task', async () => {
      const task = createTask();
      const agentId = 'test-agent';

      await manager.assignTask(task, agentId);
      await manager.cancelTask(task.id);

      const taskCount = await manager.getAgentTaskCount(agentId);
      expect(taskCount).toBe(0);
    });
  });

  describe('resource management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should acquire and release resource', async () => {
      const resourceId = 'test-resource';
      const agentId = 'test-agent';

      await manager.acquireResource(resourceId, agentId);
      await manager.releaseResource(resourceId, agentId);

      // Should not throw
    });
  });

  describe('messaging', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should send message between agents', async () => {
      const from = 'agent-1';
      const to = 'agent-2';
      const message = { type: 'test', data: 'hello' };

      await manager.sendMessage(from, to, message);

      // Should complete without error
    });
  });

  describe('health monitoring', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should return healthy status', async () => {
      const health = await manager.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.metrics).toBeDefined();
    });
  });

  describe('maintenance', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should perform maintenance on all components', async () => {
      await manager.performMaintenance();

      expect(mocks.logger.debug).toHaveBeenCalledWith('Performing coordination manager maintenance');
    });
  });
});

describe('WorkStealingCoordinator', () => {
  let coordinator: WorkStealingCoordinator;
  let mocks: ReturnType<typeof createMocks>;
  let config: any;

  beforeEach(() => {
    config = {
      enabled: true,
      stealThreshold: 3,
      maxStealBatch: 2,
      stealInterval: 5000,
    };

    mocks = createMocks();
    coordinator = new WorkStealingCoordinator(config, mocks.eventBus, mocks.logger);
  });

  afterEach(async () => {
    try {
      await coordinator.shutdown();
    } catch {
      // Ignore
    }
  });

  it('should initialize when enabled', async () => {
    await coordinator.initialize();

    expect(mocks.logger.info).toHaveBeenCalled();
  });

  it('should not initialize when disabled', async () => {
    config.enabled = false;
    coordinator = new WorkStealingCoordinator(config, mocks.eventBus, mocks.logger);

    await coordinator.initialize();

    expect(mocks.logger.info).toHaveBeenCalled();
  });

  it('should update agent workload', () => {
    coordinator.updateAgentWorkload('agent-1', {
      agentId: 'agent-1',
      taskCount: 5,
      avgTaskDuration: 1000,
      cpuUsage: 50,
      memoryUsage: 60,
      priority: 10,
      capabilities: ['test'],
    });

    const stats = coordinator.getWorkloadStats();
    expect(stats.totalAgents).toBe(1);
  });

  it('should record task duration', () => {
    coordinator.recordTaskDuration('agent-1', 1500);
    coordinator.recordTaskDuration('agent-1', 2500);

    const stats = coordinator.getWorkloadStats();
    expect(stats).toBeDefined();
  });

  it('should find best agent for task', () => {
    const task = createTask({ type: 'test' });
    const agents = [
      createAgentProfile({
        id: 'agent-1',
        capabilities: ['test'],
        priority: 5,
      }),
      createAgentProfile({
        id: 'agent-2',
        capabilities: ['other'],
        priority: 10,
      }),
    ];

    coordinator.updateAgentWorkload('agent-1', {
      agentId: 'agent-1',
      taskCount: 2,
      avgTaskDuration: 1000,
      cpuUsage: 30,
      memoryUsage: 40,
      priority: 5,
      capabilities: ['test'],
    });

    coordinator.updateAgentWorkload('agent-2', {
      agentId: 'agent-2',
      taskCount: 5,
      avgTaskDuration: 1500,
      cpuUsage: 80,
      memoryUsage: 90,
      priority: 10,
      capabilities: ['other'],
    });

    const bestAgent = coordinator.findBestAgent(task, agents);
    expect(bestAgent).toBe('agent-1');
  });
});

describe('DependencyGraph', () => {
  let graph: DependencyGraph;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
    graph = new DependencyGraph(mocks.logger);
  });

  it('should add task without dependencies', () => {
    const task = createTask({
      id: 'task-1',
      dependencies: [],
    });

    graph.addTask(task);
    expect(graph.isTaskReady('task-1')).toBe(true);
  });

  it('should add task with completed dependencies', () => {
    const task1 = createTask({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = createTask({
      id: 'task-2',
      dependencies: ['task-1'],
    });

    graph.addTask(task1);
    graph.markCompleted('task-1');
    graph.addTask(task2);

    expect(graph.isTaskReady('task-2')).toBe(true);
  });

  it('should handle task completion and mark dependents ready', () => {
    const task1 = createTask({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = createTask({
      id: 'task-2',
      dependencies: ['task-1'],
    });

    graph.addTask(task1);
    graph.addTask(task2);

    expect(graph.isTaskReady('task-2')).toBe(false);

    const readyTasks = graph.markCompleted('task-1');
    expect(readyTasks).toContain('task-2');
    expect(graph.isTaskReady('task-2')).toBe(true);
  });

  it('should throw when adding task with missing dependency', () => {
    const task1 = createTask({
      id: 'task-1',
      dependencies: ['task-2'], // task-2 doesn't exist
    });

    // DependencyGraph validates dependencies at add time, preventing invalid DAGs
    expect(() => graph.addTask(task1)).toThrow();
  });

  it('should detect no cycles in valid DAG', () => {
    const task1 = createTask({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = createTask({
      id: 'task-2',
      dependencies: ['task-1'],
    });

    graph.addTask(task1);
    graph.addTask(task2);

    const cycles = graph.detectCycles();
    expect(cycles.length).toBe(0);
  });

  it('should perform topological sort', () => {
    const task1 = createTask({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = createTask({
      id: 'task-2',
      dependencies: ['task-1'],
    });
    const task3 = createTask({
      id: 'task-3',
      dependencies: ['task-2'],
    });

    graph.addTask(task1);
    graph.addTask(task2);
    graph.addTask(task3);

    const sorted = graph.topologicalSort();
    expect(sorted).toBeDefined();
    expect(sorted.indexOf('task-1')).toBeLessThan(sorted.indexOf('task-2'));
    expect(sorted.indexOf('task-2')).toBeLessThan(sorted.indexOf('task-3'));
  });

  it('should find critical path', () => {
    const task1 = createTask({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = createTask({
      id: 'task-2',
      dependencies: ['task-1'],
    });

    graph.addTask(task1);
    graph.addTask(task2);

    const criticalPath = graph.findCriticalPath();
    expect(criticalPath).toBeDefined();
    expect(criticalPath.path.length).toBe(2);
  });

  it('should export to DOT format', () => {
    const task1 = createTask({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = createTask({
      id: 'task-2',
      dependencies: ['task-1'],
    });

    graph.addTask(task1);
    graph.addTask(task2);

    const dot = graph.toDot();
    expect(dot).toContain('digraph');
    expect(dot).toContain('task-1');
  });
});

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  let mocks: ReturnType<typeof createMocks>;
  let config: any;

  beforeEach(() => {
    config = {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      halfOpenLimit: 1,
    };

    mocks = createMocks();
    breaker = new CircuitBreaker('test-breaker', config, mocks.logger);
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

    for (let i = 0; i < config.failureThreshold; i++) {
      try {
        await breaker.execute(failingFn);
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reject requests when open', async () => {
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
    expect(resolution.winner).toBe('agent-2');
    expect(conflict.resolved).toBe(true);
  });

  it('should resolve conflict using timestamp strategy', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);

    const now = new Date();
    const context = {
      requestTimestamps: new Map([
        ['agent-1', new Date(now.getTime() - 1000)],
        ['agent-2', now],
      ]),
    };

    const resolution = await resolver.resolveConflict(conflict.id, 'timestamp', context);

    expect(resolution.type).toBe('timestamp');
    expect(resolution.winner).toBe('agent-1');
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

    await resolver.autoResolve(conflict.id);

    // cleanupOldConflicts uses > comparison, not >=
    // Use -1 to ensure all resolved conflicts are cleaned up regardless of age
    const removed = resolver.cleanupOldConflicts(-1);

    expect(removed).toBe(1);
  });
});
