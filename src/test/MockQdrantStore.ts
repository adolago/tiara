/**
 * MockQdrantStore - In-Memory Test Implementation
 *
 * Provides a fully functional mock of QdrantStore that operates entirely
 * in-memory without requiring an agent-core daemon or Qdrant instance.
 *
 * Use cases:
 * - Unit testing hive-mind components
 * - Integration testing without external dependencies
 * - CI/CD pipelines
 * - Development without running daemon
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { debugLog } from "./test-mode";

// =============================================================================
// Types (mirroring QdrantStore types)
// =============================================================================

export const TiaraNamespaces = {
  LEARNING: "tiara:learning",
  DECISIONS: "tiara:decisions",
  PATTERNS: "tiara:patterns",
  AGENT_STATE: "tiara:agent-state",
  SWARM_HISTORY: "tiara:swarm-history",
  TRAJECTORIES: "tiara:trajectories",
  SWARMS: "tiara:swarms",
  AGENTS: "tiara:agents",
  TASKS: "tiara:tasks",
  COMMUNICATIONS: "tiara:communications",
  CONSENSUS: "tiara:consensus",
  METRICS: "tiara:metrics",
  QUEEN_DECISIONS: "tiara:queen-decisions",
} as const;

export type TiaraNamespace = (typeof TiaraNamespaces)[keyof typeof TiaraNamespaces];

export type SwarmTopology = "mesh" | "hierarchical" | "ring" | "star" | "hybrid";
export type AgentStatusType = "idle" | "busy" | "error" | "offline" | "starting";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "failed" | "cancelled";
export type TaskStrategy = "single" | "parallel" | "sequential" | "consensus" | "competitive";
export type MessagePriority = "urgent" | "high" | "normal" | "low";
export type MessageType = "task_assignment" | "status_update" | "data_sharing" | "coordination" | "error_report" | "consensus_vote" | "heartbeat" | "broadcast";
export type ConsensusStatus = "pending" | "achieved" | "rejected" | "expired" | "cancelled";

export interface SwarmData {
  id: string;
  name: string;
  topology: SwarmTopology;
  queenMode: boolean;
  maxAgents: number;
  consensusThreshold: number;
  memoryTTL: number;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface AgentData {
  id: string;
  swarmId: string;
  name: string;
  type: string;
  status: AgentStatusType;
  capabilities: string[];
  currentTaskId?: string;
  successCount: number;
  errorCount: number;
  messageCount: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  lastHeartbeat: number;
}

export interface TaskData {
  id: string;
  swarmId: string;
  description: string;
  priority: TaskPriority;
  strategy: TaskStrategy;
  status: TaskStatus;
  dependencies: string[];
  assignedAgents: string[];
  requireConsensus: boolean;
  maxAgents: number;
  requiredCapabilities: string[];
  result?: unknown;
  error?: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  completedAt?: number;
}

export interface CommunicationData {
  id: string;
  fromAgentId: string;
  toAgentId?: string;
  swarmId: string;
  messageType: MessageType;
  content: string;
  priority: MessagePriority;
  requiresResponse: boolean;
  deliveredAt?: number;
  readAt?: number;
  timestamp: number;
}

export interface ConsensusData {
  id: string;
  swarmId: string;
  taskId?: string;
  proposal: Record<string, unknown>;
  requiredThreshold: number;
  status: ConsensusStatus;
  votes: Record<string, { vote: boolean; reason?: string; timestamp: number }>;
  currentVotes: number;
  totalVoters: number;
  deadline: number;
  createdAt: number;
  resolvedAt?: number;
}

export interface MetricsData {
  id: string;
  swarmId: string;
  agentId?: string;
  metricType: string;
  metricValue: number;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface MemoryData {
  key: string;
  namespace: string;
  value: string;
  ttl?: number;
  createdAt: number;
}

// =============================================================================
// MockQdrantStore Implementation
// =============================================================================

/**
 * In-memory mock of QdrantStore for testing
 */
export class MockQdrantStore extends EventEmitter {
  private static instance: MockQdrantStore | null = null;

  // In-memory storage
  private swarmCache = new Map<string, SwarmData>();
  private agentCache = new Map<string, AgentData>();
  private taskCache = new Map<string, TaskData>();
  private communicationCache = new Map<string, CommunicationData>();
  private consensusCache = new Map<string, ConsensusData>();
  private metricsCache: MetricsData[] = [];
  private memoryCache = new Map<string, MemoryData>();

  // Active swarm tracking
  private activeSwarmId: string | null = null;

  constructor() {
    super();
    debugLog("MockQdrantStore", "Initialized mock store");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MockQdrantStore {
    if (!MockQdrantStore.instance) {
      MockQdrantStore.instance = new MockQdrantStore();
    }
    return MockQdrantStore.instance;
  }

  /**
   * Reset mock store for testing
   */
  reset(): void {
    this.swarmCache.clear();
    this.agentCache.clear();
    this.taskCache.clear();
    this.communicationCache.clear();
    this.consensusCache.clear();
    this.metricsCache = [];
    this.memoryCache.clear();
    this.activeSwarmId = null;
    debugLog("MockQdrantStore", "Store reset");
  }

  /**
   * Destroy singleton instance
   */
  static destroy(): void {
    if (MockQdrantStore.instance) {
      MockQdrantStore.instance.reset();
      MockQdrantStore.instance = null;
    }
  }

  // =============================================================================
  // Swarm Operations
  // =============================================================================

  async createSwarm(data: Omit<SwarmData, "createdAt">): Promise<string> {
    const swarm: SwarmData = {
      ...data,
      createdAt: Date.now(),
    };
    this.swarmCache.set(data.id, swarm);
    if (swarm.isActive) {
      this.activeSwarmId = swarm.id;
    }
    debugLog("MockQdrantStore", `Created swarm: ${data.id}`);
    this.emit("swarm:created", swarm);
    return data.id;
  }

  async getSwarm(id: string): Promise<SwarmData | null> {
    return this.swarmCache.get(id) || null;
  }

  async getActiveSwarmId(): Promise<string | null> {
    return this.activeSwarmId;
  }

  async updateSwarm(id: string, updates: Partial<SwarmData>): Promise<void> {
    const swarm = this.swarmCache.get(id);
    if (swarm) {
      Object.assign(swarm, updates, { updatedAt: Date.now() });
      if (updates.isActive) {
        this.activeSwarmId = id;
      }
      this.emit("swarm:updated", swarm);
    }
  }

  async deleteSwarm(id: string): Promise<void> {
    this.swarmCache.delete(id);
    if (this.activeSwarmId === id) {
      this.activeSwarmId = null;
    }
    this.emit("swarm:deleted", id);
  }

  async listSwarms(): Promise<SwarmData[]> {
    return Array.from(this.swarmCache.values());
  }

  // =============================================================================
  // Agent Operations
  // =============================================================================

  async registerAgent(data: Omit<AgentData, "createdAt" | "lastHeartbeat" | "successCount" | "errorCount" | "messageCount">): Promise<string> {
    const agent: AgentData = {
      ...data,
      successCount: 0,
      errorCount: 0,
      messageCount: 0,
      createdAt: Date.now(),
      lastHeartbeat: Date.now(),
    };
    this.agentCache.set(data.id, agent);
    debugLog("MockQdrantStore", `Registered agent: ${data.id}`);
    this.emit("agent:registered", agent);
    return data.id;
  }

  async getAgent(id: string): Promise<AgentData | null> {
    return this.agentCache.get(id) || null;
  }

  async updateAgent(id: string, updates: Partial<AgentData>): Promise<void> {
    const agent = this.agentCache.get(id);
    if (agent) {
      Object.assign(agent, updates);
      this.emit("agent:updated", agent);
    }
  }

  async updateAgentHeartbeat(id: string): Promise<void> {
    const agent = this.agentCache.get(id);
    if (agent) {
      agent.lastHeartbeat = Date.now();
    }
  }

  async deregisterAgent(id: string): Promise<void> {
    this.agentCache.delete(id);
    this.emit("agent:deregistered", id);
  }

  async listAgents(swarmId?: string): Promise<AgentData[]> {
    const agents = Array.from(this.agentCache.values());
    if (swarmId) {
      return agents.filter(a => a.swarmId === swarmId);
    }
    return agents;
  }

  async getAvailableAgents(swarmId: string, capabilities?: string[]): Promise<AgentData[]> {
    return Array.from(this.agentCache.values()).filter(a => {
      if (a.swarmId !== swarmId) return false;
      if (a.status !== "idle") return false;
      if (capabilities && capabilities.length > 0) {
        return capabilities.every(c => a.capabilities.includes(c));
      }
      return true;
    });
  }

  // =============================================================================
  // Task Operations
  // =============================================================================

  async createTask(data: Omit<TaskData, "createdAt">): Promise<string> {
    const task: TaskData = {
      ...data,
      createdAt: Date.now(),
    };
    this.taskCache.set(data.id, task);
    debugLog("MockQdrantStore", `Created task: ${data.id}`);
    this.emit("task:created", task);
    return data.id;
  }

  async getTask(id: string): Promise<TaskData | null> {
    return this.taskCache.get(id) || null;
  }

  async updateTask(id: string, updates: Partial<TaskData>): Promise<void> {
    const task = this.taskCache.get(id);
    if (task) {
      Object.assign(task, updates);
      if (updates.status === "completed" || updates.status === "failed") {
        task.completedAt = Date.now();
      }
      this.emit("task:updated", task);
    }
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
    await this.updateTask(id, { status });
  }

  async deleteTask(id: string): Promise<void> {
    this.taskCache.delete(id);
    this.emit("task:deleted", id);
  }

  async listTasks(swarmId?: string, status?: TaskStatus): Promise<TaskData[]> {
    let tasks = Array.from(this.taskCache.values());
    if (swarmId) {
      tasks = tasks.filter(t => t.swarmId === swarmId);
    }
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    return tasks;
  }

  async getPendingTasks(swarmId: string): Promise<TaskData[]> {
    return this.listTasks(swarmId, "pending");
  }

  // =============================================================================
  // Communication Operations
  // =============================================================================

  async createCommunication(data: Omit<CommunicationData, "id" | "timestamp">): Promise<string> {
    const id = randomUUID();
    const comm: CommunicationData = {
      ...data,
      id,
      timestamp: Date.now(),
    };
    this.communicationCache.set(id, comm);
    this.emit("communication:created", comm);
    return id;
  }

  async getCommunication(id: string): Promise<CommunicationData | null> {
    return this.communicationCache.get(id) || null;
  }

  async getUnreadMessages(agentId: string): Promise<CommunicationData[]> {
    return Array.from(this.communicationCache.values()).filter(c =>
      (c.toAgentId === agentId || !c.toAgentId) && !c.readAt
    );
  }

  async markMessageRead(id: string): Promise<void> {
    const comm = this.communicationCache.get(id);
    if (comm) {
      comm.readAt = Date.now();
    }
  }

  async markMessageDelivered(id: string): Promise<void> {
    const comm = this.communicationCache.get(id);
    if (comm) {
      comm.deliveredAt = Date.now();
    }
  }

  // =============================================================================
  // Consensus Operations
  // =============================================================================

  async createConsensusProposal(data: Omit<ConsensusData, "id" | "createdAt" | "votes" | "currentVotes" | "status">): Promise<string> {
    const id = randomUUID();
    const consensus: ConsensusData = {
      ...data,
      id,
      status: "pending",
      votes: {},
      currentVotes: 0,
      createdAt: Date.now(),
    };
    this.consensusCache.set(id, consensus);
    this.emit("consensus:created", consensus);
    return id;
  }

  async getConsensusProposal(id: string): Promise<ConsensusData | null> {
    return this.consensusCache.get(id) || null;
  }

  async submitConsensusVote(proposalId: string, agentId: string, vote: boolean, reason?: string): Promise<void> {
    const consensus = this.consensusCache.get(proposalId);
    if (consensus) {
      consensus.votes[agentId] = { vote, reason, timestamp: Date.now() };
      consensus.currentVotes = Object.keys(consensus.votes).length;
      this.emit("consensus:voted", { proposalId, agentId, vote });
    }
  }

  async updateConsensusStatus(id: string, status: ConsensusStatus): Promise<void> {
    const consensus = this.consensusCache.get(id);
    if (consensus) {
      consensus.status = status;
      if (status !== "pending") {
        consensus.resolvedAt = Date.now();
      }
      this.emit("consensus:updated", consensus);
    }
  }

  async getRecentConsensusProposals(swarmId: string, limit: number = 10): Promise<ConsensusData[]> {
    return Array.from(this.consensusCache.values())
      .filter(c => c.swarmId === swarmId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  // =============================================================================
  // Metrics Operations
  // =============================================================================

  async recordMetric(data: Omit<MetricsData, "id" | "timestamp">): Promise<string> {
    const id = randomUUID();
    const metric: MetricsData = {
      ...data,
      id,
      timestamp: Date.now(),
    };
    this.metricsCache.push(metric);
    this.emit("metrics:recorded", metric);
    return id;
  }

  async getMetrics(swarmId: string, metricType?: string, limit: number = 100): Promise<MetricsData[]> {
    let metrics = this.metricsCache.filter(m => m.swarmId === swarmId);
    if (metricType) {
      metrics = metrics.filter(m => m.metricType === metricType);
    }
    return metrics.slice(-limit);
  }

  // =============================================================================
  // Memory Operations
  // =============================================================================

  async storeMemory(data: MemoryData): Promise<void> {
    const key = `${data.namespace}:${data.key}`;
    this.memoryCache.set(key, { ...data, createdAt: Date.now() });
    this.emit("memory:stored", data);
  }

  async getMemory(namespace: string, key: string): Promise<MemoryData | null> {
    return this.memoryCache.get(`${namespace}:${key}`) || null;
  }

  async searchMemory(namespace: string, query: string): Promise<MemoryData[]> {
    const results: MemoryData[] = [];
    for (const [k, v] of this.memoryCache.entries()) {
      if (k.startsWith(namespace) && (v.value.includes(query) || v.key.includes(query))) {
        results.push(v);
      }
    }
    return results;
  }

  async deleteMemory(namespace: string, key: string): Promise<void> {
    this.memoryCache.delete(`${namespace}:${key}`);
    this.emit("memory:deleted", { namespace, key });
  }

  async getAllMemoryEntries(namespace: string): Promise<MemoryData[]> {
    const results: MemoryData[] = [];
    for (const [k, v] of this.memoryCache.entries()) {
      if (k.startsWith(namespace)) {
        results.push(v);
      }
    }
    return results;
  }

  // =============================================================================
  // Debug / Test Utilities
  // =============================================================================

  /**
   * Get current state snapshot for debugging
   */
  getSnapshot(): {
    swarms: SwarmData[];
    agents: AgentData[];
    tasks: TaskData[];
    communications: CommunicationData[];
    consensus: ConsensusData[];
    metrics: MetricsData[];
    memory: MemoryData[];
  } {
    return {
      swarms: Array.from(this.swarmCache.values()),
      agents: Array.from(this.agentCache.values()),
      tasks: Array.from(this.taskCache.values()),
      communications: Array.from(this.communicationCache.values()),
      consensus: Array.from(this.consensusCache.values()),
      metrics: this.metricsCache,
      memory: Array.from(this.memoryCache.values()),
    };
  }

  /**
   * Load state from snapshot (for test setup)
   */
  loadSnapshot(snapshot: ReturnType<typeof this.getSnapshot>): void {
    this.reset();
    snapshot.swarms.forEach(s => this.swarmCache.set(s.id, s));
    snapshot.agents.forEach(a => this.agentCache.set(a.id, a));
    snapshot.tasks.forEach(t => this.taskCache.set(t.id, t));
    snapshot.communications.forEach(c => this.communicationCache.set(c.id, c));
    snapshot.consensus.forEach(c => this.consensusCache.set(c.id, c));
    this.metricsCache = [...snapshot.metrics];
    snapshot.memory.forEach(m => this.memoryCache.set(`${m.namespace}:${m.key}`, m));
    debugLog("MockQdrantStore", "Loaded snapshot");
  }
}

/**
 * Get mock store instance (singleton)
 */
export async function getMockQdrantStore(): Promise<MockQdrantStore> {
  return MockQdrantStore.getInstance();
}

export default MockQdrantStore;
