import fs from 'fs';
import os from 'os';
import path from 'path';
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
let cachedAgentCoreConfig;
function sanitizeJsonc(input) {
    let output = '';
    let inString = false;
    let stringChar = '';
    let escaped = false;
    let inLineComment = false;
    let inBlockComment = false;
    for(let i = 0; i < input.length; i++){
        const char = input[i];
        const next = input[i + 1];
        if (inLineComment) {
            if (char === '\n') {
                inLineComment = false;
                output += char;
            }
            continue;
        }
        if (inBlockComment) {
            if (char === '*' && next === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }
        if (inString) {
            output += char;
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === stringChar) {
                inString = false;
            }
            continue;
        }
        if (char === '"' || char === '\'') {
            inString = true;
            stringChar = char;
            output += char;
            continue;
        }
        if (char === '/' && next === '/') {
            inLineComment = true;
            i++;
            continue;
        }
        if (char === '/' && next === '*') {
            inBlockComment = true;
            i++;
            continue;
        }
        output += char;
    }
    return output.replace(/,\s*([}\]])/g, '$1');
}
function loadAgentCoreConfig() {
    if (cachedAgentCoreConfig !== undefined) {
        return cachedAgentCoreConfig;
    }
    const configHome = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
    const candidates = [
        path.join(configHome, 'agent-core', 'agent-core.jsonc'),
        path.join(configHome, 'agent-core', 'agent-core.json')
    ];
    const agentCoreRoot = process.env.AGENT_CORE_ROOT;
    if (agentCoreRoot) {
        candidates.push(path.join(agentCoreRoot, '.agent-core', 'agent-core.jsonc'), path.join(agentCoreRoot, '.agent-core', 'agent-core.json'));
    }
    for (const candidate of candidates){
        try {
            const contents = fs.readFileSync(candidate, 'utf8');
            const parsed = JSON.parse(sanitizeJsonc(contents));
            if (parsed && typeof parsed === 'object') {
                cachedAgentCoreConfig = parsed;
                return cachedAgentCoreConfig;
            }
        } catch  {
            continue;
        }
    }
    cachedAgentCoreConfig = null;
    return null;
}
function getConfigFromEnv() {
    const agentCoreConfig = loadAgentCoreConfig();
    const memoryQdrant = {
        url: agentCoreConfig?.memory?.qdrant?.url ?? agentCoreConfig?.memory?.qdrantUrl,
        apiKey: agentCoreConfig?.memory?.qdrant?.apiKey ?? agentCoreConfig?.memory?.qdrantApiKey,
        collection: agentCoreConfig?.memory?.qdrant?.collection ?? agentCoreConfig?.memory?.qdrantCollection
    };
    const memoryEmbeddingDimension = agentCoreConfig?.memory?.embedding?.dimensions ?? agentCoreConfig?.memory?.embedding?.dimension;
    const tiaraQdrant = agentCoreConfig?.tiara?.qdrant ?? {};
    const configHasQdrant = Boolean(tiaraQdrant.url || memoryQdrant.url);
    const type = configHasQdrant ? 'qdrant' : 'sqlite';
    const embeddingDimension = tiaraQdrant.embeddingDimension ?? (typeof memoryEmbeddingDimension === 'number' ? memoryEmbeddingDimension : undefined) ?? DEFAULT_QDRANT_CONFIG.embeddingDimension;
    const resolvedEmbeddingDimension = embeddingDimension;
    return {
        type,
        sqlite: {
            path: process.env.TIARA_SQLITE_PATH ?? '.swarm/memory.db'
        },
        qdrant: {
            url: tiaraQdrant.url ?? memoryQdrant.url ?? DEFAULT_QDRANT_CONFIG.url,
            apiKey: tiaraQdrant.apiKey ?? memoryQdrant.apiKey,
            collections: {
                coordination: tiaraQdrant.coordinationCollection ?? tiaraQdrant.stateCollection ?? DEFAULT_QDRANT_CONFIG.collections.coordination,
                events: tiaraQdrant.eventsCollection ?? DEFAULT_QDRANT_CONFIG.collections.events,
                patterns: tiaraQdrant.patternsCollection ?? DEFAULT_QDRANT_CONFIG.collections.patterns,
                memory: tiaraQdrant.memoryCollection ?? memoryQdrant.collection ?? DEFAULT_QDRANT_CONFIG.collections.memory
            },
            embeddingDimension: resolvedEmbeddingDimension
        }
    };
}
export { QdrantStorageBackend, QdrantCoordinationAdapter, QdrantConfig, DEFAULT_QDRANT_CONFIG };

//# sourceMappingURL=storage-factory.js.map