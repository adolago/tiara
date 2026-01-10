import { QdrantCoordinationAdapter, QdrantConfig, DEFAULT_QDRANT_CONFIG } from './qdrant-adapter.js';
export const DEFAULT_STORAGE_CONFIG = {
    type: 'sqlite',
    sqlite: {
        path: '.swarm/memory.db'
    }
};
let QdrantStorageBackend = class QdrantStorageBackend {
    adapter;
    constructor(config){
        this.adapter = new QdrantCoordinationAdapter(config);
    }
    async initialize() {
        await this.adapter.initialize();
    }
    async shutdown() {}
    async createSwarm(swarm) {
        return this.adapter.createSwarm(swarm);
    }
    async getSwarm(id) {
        return this.adapter.getSwarm(id);
    }
    async updateSwarmStatus(id, status) {
        return this.adapter.updateSwarmStatus(id, status);
    }
    async deleteSwarm(id) {
        return this.adapter.deleteSwarm(id);
    }
    async listSwarms(status) {
        return this.adapter.listSwarms(status);
    }
    async createAgent(agent) {
        return this.adapter.createAgent(agent);
    }
    async getAgent(id) {
        return this.adapter.getAgent(id);
    }
    async updateAgentStatus(id, status) {
        return this.adapter.updateAgentStatus(id, status);
    }
    async getAgentsBySwarm(swarmId) {
        return this.adapter.getAgentsBySwarm(swarmId);
    }
    async deleteAgent(id) {
        return this.adapter.deleteAgent(id);
    }
    async createTask(task) {
        return this.adapter.createTask(task);
    }
    async getTask(id) {
        return this.adapter.getTask(id);
    }
    async updateTaskStatus(id, status, result, errorMessage) {
        return this.adapter.updateTaskStatus(id, status, result, errorMessage);
    }
    async getTasksBySwarm(swarmId, status) {
        return this.adapter.getTasksBySwarm(swarmId, status);
    }
    async deleteTask(id) {
        return this.adapter.deleteTask(id);
    }
    async logEvent(event) {
        return this.adapter.logEvent(event);
    }
    async getEvents(filters, limit = 100) {
        return this.adapter.getEvents(filters, limit);
    }
    async recordMetric(metric) {
        return this.adapter.recordMetric(metric);
    }
    async getMetrics(filters, limit = 100) {
        return this.adapter.getMetrics(filters, limit);
    }
    async memoryStore(key, value, namespace = 'default', options) {
        return this.adapter.memoryStore(key, value, namespace, options);
    }
    async memoryGet(key, namespace = 'default') {
        const entry = await this.adapter.memoryGet(key, namespace);
        if (!entry) return null;
        return {
            value: entry.value,
            metadata: entry.metadata
        };
    }
    async memoryDelete(key, namespace = 'default') {
        return this.adapter.memoryDelete(key, namespace);
    }
    async memoryList(namespace = 'default', limit = 100) {
        const entries = await this.adapter.memoryList(namespace, limit);
        return entries.map((e)=>({
                key: e.key,
                value: e.value,
                namespace: e.namespace
            }));
    }
    async cleanup() {
        return this.adapter.cleanup();
    }
};
let _storage = null;
export async function getStorage(config) {
    if (_storage) {
        return _storage;
    }
    const finalConfig = config ?? getConfigFromEnv();
    switch(finalConfig.type){
        case 'qdrant':
            _storage = new QdrantStorageBackend(finalConfig.qdrant);
            break;
        case 'hybrid':
            console.warn('Hybrid mode not fully implemented, using Qdrant');
            _storage = new QdrantStorageBackend(finalConfig.qdrant);
            break;
        case 'sqlite':
        default:
            throw new Error('SQLite backend not available through storage factory. ' + 'Use the legacy DatabaseService directly or migrate to Qdrant.');
    }
    await _storage.initialize();
    return _storage;
}
export async function resetStorage() {
    if (_storage) {
        await _storage.shutdown();
        _storage = null;
    }
}
function getConfigFromEnv() {
    const type = process.env.TIARA_STORAGE_TYPE ?? 'sqlite';
    return {
        type,
        sqlite: {
            path: process.env.TIARA_SQLITE_PATH ?? '.swarm/memory.db'
        },
        qdrant: {
            url: process.env.TIARA_QDRANT_URL ?? DEFAULT_QDRANT_CONFIG.url,
            apiKey: process.env.TIARA_QDRANT_API_KEY,
            collections: {
                coordination: process.env.TIARA_QDRANT_COORDINATION_COLLECTION ?? DEFAULT_QDRANT_CONFIG.collections.coordination,
                events: process.env.TIARA_QDRANT_EVENTS_COLLECTION ?? DEFAULT_QDRANT_CONFIG.collections.events,
                patterns: process.env.TIARA_QDRANT_PATTERNS_COLLECTION ?? DEFAULT_QDRANT_CONFIG.collections.patterns,
                memory: process.env.TIARA_QDRANT_MEMORY_COLLECTION ?? DEFAULT_QDRANT_CONFIG.collections.memory
            },
            embeddingDimension: parseInt(process.env.TIARA_EMBEDDING_DIMENSION ?? '384', 10)
        }
    };
}
export { QdrantStorageBackend, QdrantCoordinationAdapter, QdrantConfig, DEFAULT_QDRANT_CONFIG };

//# sourceMappingURL=storage-factory.js.map