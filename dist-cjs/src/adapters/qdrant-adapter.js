import { nanoid } from 'nanoid';
export const DEFAULT_QDRANT_CONFIG = {
    url: 'http://localhost:6333',
    collections: {
        coordination: 'tiara_coordination',
        events: 'tiara_events',
        patterns: 'tiara_patterns',
        memory: 'tiara_memory'
    },
    embeddingDimension: 384
};
export class QdrantCoordinationAdapter {
    baseUrl;
    apiKey;
    collections;
    embeddingDimension;
    initialized = false;
    constructor(config = {}){
        const fullConfig = {
            ...DEFAULT_QDRANT_CONFIG,
            ...config
        };
        this.baseUrl = fullConfig.url.replace(/\/$/, '');
        this.apiKey = fullConfig.apiKey;
        this.collections = {
            ...DEFAULT_QDRANT_CONFIG.collections,
            ...config.collections
        };
        this.embeddingDimension = fullConfig.embeddingDimension;
    }
    async request(method, path, body) {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.apiKey) {
            headers['api-key'] = this.apiKey;
        }
        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Qdrant ${method} ${path} failed (${response.status}): ${errorText}`);
        }
        const data = await response.json();
        return data.result ?? data;
    }
    async collectionExists(name) {
        try {
            await this.request('GET', `/collections/${name}`);
            return true;
        } catch  {
            return false;
        }
    }
    async ensureCollection(name, indexes) {
        const exists = await this.collectionExists(name);
        if (exists) return;
        await this.request('PUT', `/collections/${name}`, {
            vectors: {
                size: this.embeddingDimension,
                distance: 'Cosine'
            }
        });
        for (const { field, schema } of indexes){
            try {
                await this.request('PUT', `/collections/${name}/index`, {
                    field_name: field,
                    field_schema: schema
                });
            } catch (e) {
                console.warn(`Failed to create index ${field} on ${name}:`, e);
            }
        }
    }
    async initialize() {
        if (this.initialized) return;
        await this.ensureCollection(this.collections.coordination, [
            {
                field: 'entityType',
                schema: 'keyword'
            },
            {
                field: 'status',
                schema: 'keyword'
            },
            {
                field: 'swarmId',
                schema: 'keyword'
            },
            {
                field: 'agentId',
                schema: 'keyword'
            },
            {
                field: 'createdAt',
                schema: {
                    type: 'integer',
                    lookup: true,
                    range: true
                }
            },
            {
                field: 'updatedAt',
                schema: {
                    type: 'integer',
                    lookup: true,
                    range: true
                }
            }
        ]);
        await this.ensureCollection(this.collections.events, [
            {
                field: 'severity',
                schema: 'keyword'
            },
            {
                field: 'eventType',
                schema: 'keyword'
            },
            {
                field: 'swarmId',
                schema: 'keyword'
            },
            {
                field: 'agentId',
                schema: 'keyword'
            },
            {
                field: 'createdAt',
                schema: {
                    type: 'integer',
                    lookup: true,
                    range: true
                }
            }
        ]);
        await this.ensureCollection(this.collections.patterns, [
            {
                field: 'patternType',
                schema: 'keyword'
            },
            {
                field: 'effectiveness',
                schema: {
                    type: 'float',
                    lookup: true,
                    range: true
                }
            },
            {
                field: 'occurrences',
                schema: {
                    type: 'integer',
                    lookup: true,
                    range: true
                }
            },
            {
                field: 'createdAt',
                schema: {
                    type: 'integer',
                    lookup: true,
                    range: true
                }
            }
        ]);
        await this.ensureCollection(this.collections.memory, [
            {
                field: 'namespace',
                schema: 'keyword'
            },
            {
                field: 'key',
                schema: 'keyword'
            },
            {
                field: 'expiresAt',
                schema: {
                    type: 'integer',
                    lookup: true,
                    range: true
                }
            },
            {
                field: 'accessedAt',
                schema: {
                    type: 'integer',
                    lookup: true,
                    range: true
                }
            }
        ]);
        this.initialized = true;
    }
    stringToUuid(str) {
        let hash = 0;
        for(let i = 0; i < str.length; i++){
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        const hex = Math.abs(hash).toString(16).padStart(8, '0');
        return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(0, 3)}-${hex.padEnd(12, '0').slice(0, 12)}`;
    }
    zeroVector() {
        return new Array(this.embeddingDimension).fill(0);
    }
    async upsert(collection, id, payload, vector) {
        await this.request('PUT', `/collections/${collection}/points`, {
            points: [
                {
                    id,
                    vector: vector ?? this.zeroVector(),
                    payload
                }
            ]
        });
    }
    async getPoint(collection, id) {
        try {
            const result = await this.request('POST', `/collections/${collection}/points`, {
                ids: [
                    id
                ],
                with_payload: true
            });
            return result[0]?.payload ?? null;
        } catch  {
            return null;
        }
    }
    async deletePoints(collection, ids) {
        await this.request('POST', `/collections/${collection}/points/delete`, {
            points: ids
        });
    }
    async search(collection, vector, filter, limit = 10) {
        return this.request('POST', `/collections/${collection}/points/search`, {
            vector,
            filter,
            limit,
            with_payload: true
        });
    }
    async scroll(collection, filter, limit = 100, offset) {
        return this.request('POST', `/collections/${collection}/points/scroll`, {
            filter,
            limit,
            offset,
            with_payload: true
        });
    }
    async createSwarm(swarm) {
        const id = nanoid();
        const now = new Date();
        await this.upsert(this.collections.coordination, this.stringToUuid(id), {
            entityType: 'swarm',
            id,
            name: swarm.name,
            topology: swarm.topology,
            maxAgents: swarm.maxAgents,
            strategy: swarm.strategy,
            status: swarm.status,
            config: swarm.config ? JSON.stringify(swarm.config) : null,
            createdAt: now.getTime(),
            updatedAt: now.getTime(),
            destroyedAt: swarm.destroyedAt?.getTime() ?? null
        });
        return id;
    }
    async getSwarm(id) {
        const payload = await this.getPoint(this.collections.coordination, this.stringToUuid(id));
        if (!payload || payload.entityType !== 'swarm') return null;
        return this.payloadToSwarmRecord(payload);
    }
    async updateSwarmStatus(id, status) {
        const existing = await this.getSwarm(id);
        if (!existing) throw new Error(`Swarm ${id} not found`);
        await this.upsert(this.collections.coordination, this.stringToUuid(id), {
            ...this.swarmRecordToPayload(existing),
            status,
            updatedAt: Date.now(),
            destroyedAt: status === 'destroyed' ? Date.now() : null
        });
    }
    async deleteSwarm(id) {
        await this.deletePoints(this.collections.coordination, [
            this.stringToUuid(id)
        ]);
    }
    async listSwarms(status) {
        const filter = {
            must: [
                {
                    key: 'entityType',
                    match: {
                        value: 'swarm'
                    }
                }
            ]
        };
        if (status) {
            filter.must.push({
                key: 'status',
                match: {
                    value: status
                }
            });
        }
        const result = await this.scroll(this.collections.coordination, filter);
        return result.points.map((p)=>this.payloadToSwarmRecord(p.payload));
    }
    swarmRecordToPayload(swarm) {
        return {
            entityType: 'swarm',
            id: swarm.id,
            name: swarm.name,
            topology: swarm.topology,
            maxAgents: swarm.maxAgents,
            strategy: swarm.strategy,
            status: swarm.status,
            config: swarm.config ? JSON.stringify(swarm.config) : null,
            createdAt: swarm.createdAt.getTime(),
            updatedAt: swarm.updatedAt.getTime(),
            destroyedAt: swarm.destroyedAt?.getTime() ?? null
        };
    }
    payloadToSwarmRecord(payload) {
        return {
            id: payload.id,
            name: payload.name,
            topology: payload.topology,
            maxAgents: payload.maxAgents,
            strategy: payload.strategy,
            status: payload.status,
            config: payload.config ? JSON.parse(payload.config) : undefined,
            createdAt: new Date(payload.createdAt),
            updatedAt: new Date(payload.updatedAt),
            destroyedAt: payload.destroyedAt ? new Date(payload.destroyedAt) : undefined
        };
    }
    async createAgent(agent) {
        const id = nanoid();
        const now = new Date();
        await this.upsert(this.collections.coordination, this.stringToUuid(id), {
            entityType: 'agent',
            id,
            swarmId: agent.swarmId,
            type: agent.type,
            name: agent.name ?? null,
            status: agent.status,
            capabilities: agent.capabilities ? JSON.stringify(agent.capabilities) : null,
            config: agent.config ? JSON.stringify(agent.config) : null,
            metadata: agent.metadata ? JSON.stringify(agent.metadata) : null,
            createdAt: now.getTime(),
            updatedAt: now.getTime(),
            terminatedAt: agent.terminatedAt?.getTime() ?? null
        });
        return id;
    }
    async getAgent(id) {
        const payload = await this.getPoint(this.collections.coordination, this.stringToUuid(id));
        if (!payload || payload.entityType !== 'agent') return null;
        return this.payloadToAgentRecord(payload);
    }
    async updateAgentStatus(id, status) {
        const existing = await this.getAgent(id);
        if (!existing) throw new Error(`Agent ${id} not found`);
        await this.upsert(this.collections.coordination, this.stringToUuid(id), {
            ...this.agentRecordToPayload(existing),
            status,
            updatedAt: Date.now(),
            terminatedAt: status === 'terminated' ? Date.now() : existing.terminatedAt?.getTime() ?? null
        });
    }
    async getAgentsBySwarm(swarmId) {
        const filter = {
            must: [
                {
                    key: 'entityType',
                    match: {
                        value: 'agent'
                    }
                },
                {
                    key: 'swarmId',
                    match: {
                        value: swarmId
                    }
                }
            ]
        };
        const result = await this.scroll(this.collections.coordination, filter);
        return result.points.map((p)=>this.payloadToAgentRecord(p.payload));
    }
    async deleteAgent(id) {
        await this.deletePoints(this.collections.coordination, [
            this.stringToUuid(id)
        ]);
    }
    agentRecordToPayload(agent) {
        return {
            entityType: 'agent',
            id: agent.id,
            swarmId: agent.swarmId,
            type: agent.type,
            name: agent.name ?? null,
            status: agent.status,
            capabilities: agent.capabilities ? JSON.stringify(agent.capabilities) : null,
            config: agent.config ? JSON.stringify(agent.config) : null,
            metadata: agent.metadata ? JSON.stringify(agent.metadata) : null,
            createdAt: agent.createdAt.getTime(),
            updatedAt: agent.updatedAt.getTime(),
            terminatedAt: agent.terminatedAt?.getTime() ?? null
        };
    }
    payloadToAgentRecord(payload) {
        return {
            id: payload.id,
            swarmId: payload.swarmId,
            type: payload.type,
            name: payload.name,
            status: payload.status,
            capabilities: payload.capabilities ? JSON.parse(payload.capabilities) : undefined,
            config: payload.config ? JSON.parse(payload.config) : undefined,
            metadata: payload.metadata ? JSON.parse(payload.metadata) : undefined,
            createdAt: new Date(payload.createdAt),
            updatedAt: new Date(payload.updatedAt),
            terminatedAt: payload.terminatedAt ? new Date(payload.terminatedAt) : undefined
        };
    }
    async createTask(task) {
        const id = nanoid();
        const now = new Date();
        await this.upsert(this.collections.coordination, this.stringToUuid(id), {
            entityType: 'task',
            id,
            swarmId: task.swarmId,
            description: task.description,
            priority: task.priority,
            strategy: task.strategy,
            status: task.status,
            maxAgents: task.maxAgents ?? null,
            requirements: task.requirements ? JSON.stringify(task.requirements) : null,
            metadata: task.metadata ? JSON.stringify(task.metadata) : null,
            result: task.result ? JSON.stringify(task.result) : null,
            errorMessage: task.errorMessage ?? null,
            assignedTo: task.assignedTo ?? null,
            createdAt: now.getTime(),
            updatedAt: now.getTime(),
            startedAt: task.startedAt?.getTime() ?? null,
            completedAt: task.completedAt?.getTime() ?? null
        });
        return id;
    }
    async getTask(id) {
        const payload = await this.getPoint(this.collections.coordination, this.stringToUuid(id));
        if (!payload || payload.entityType !== 'task') return null;
        return this.payloadToTaskRecord(payload);
    }
    async updateTaskStatus(id, status, result, errorMessage) {
        const existing = await this.getTask(id);
        if (!existing) throw new Error(`Task ${id} not found`);
        const updates = {
            ...this.taskRecordToPayload(existing),
            status,
            updatedAt: Date.now()
        };
        if (result !== undefined) {
            updates.result = JSON.stringify(result);
        }
        if (errorMessage !== undefined) {
            updates.errorMessage = errorMessage;
        }
        if (status === 'running' && !existing.startedAt) {
            updates.startedAt = Date.now();
        }
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            updates.completedAt = Date.now();
        }
        await this.upsert(this.collections.coordination, this.stringToUuid(id), updates);
    }
    async getTasksBySwarm(swarmId, status) {
        const filter = {
            must: [
                {
                    key: 'entityType',
                    match: {
                        value: 'task'
                    }
                },
                {
                    key: 'swarmId',
                    match: {
                        value: swarmId
                    }
                }
            ]
        };
        if (status) {
            filter.must.push({
                key: 'status',
                match: {
                    value: status
                }
            });
        }
        const result = await this.scroll(this.collections.coordination, filter);
        return result.points.map((p)=>this.payloadToTaskRecord(p.payload));
    }
    async searchTasks(query, embedding, limit = 10) {
        const filter = {
            must: [
                {
                    key: 'entityType',
                    match: {
                        value: 'task'
                    }
                }
            ]
        };
        const results = await this.search(this.collections.coordination, embedding, filter, limit);
        return results.map((r)=>this.payloadToTaskRecord(r.payload));
    }
    async deleteTask(id) {
        await this.deletePoints(this.collections.coordination, [
            this.stringToUuid(id)
        ]);
    }
    taskRecordToPayload(task) {
        return {
            entityType: 'task',
            id: task.id,
            swarmId: task.swarmId,
            description: task.description,
            priority: task.priority,
            strategy: task.strategy,
            status: task.status,
            maxAgents: task.maxAgents ?? null,
            requirements: task.requirements ? JSON.stringify(task.requirements) : null,
            metadata: task.metadata ? JSON.stringify(task.metadata) : null,
            result: task.result ? JSON.stringify(task.result) : null,
            errorMessage: task.errorMessage ?? null,
            assignedTo: task.assignedTo ?? null,
            createdAt: task.createdAt.getTime(),
            updatedAt: task.updatedAt.getTime(),
            startedAt: task.startedAt?.getTime() ?? null,
            completedAt: task.completedAt?.getTime() ?? null
        };
    }
    payloadToTaskRecord(payload) {
        return {
            id: payload.id,
            swarmId: payload.swarmId,
            description: payload.description,
            priority: payload.priority,
            strategy: payload.strategy,
            status: payload.status,
            maxAgents: payload.maxAgents,
            requirements: payload.requirements ? JSON.parse(payload.requirements) : undefined,
            metadata: payload.metadata ? JSON.parse(payload.metadata) : undefined,
            result: payload.result ? JSON.parse(payload.result) : undefined,
            errorMessage: payload.errorMessage,
            assignedTo: payload.assignedTo,
            createdAt: new Date(payload.createdAt),
            updatedAt: new Date(payload.updatedAt),
            startedAt: payload.startedAt ? new Date(payload.startedAt) : undefined,
            completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined
        };
    }
    async logEvent(event) {
        const id = nanoid();
        const now = new Date();
        await this.upsert(this.collections.events, this.stringToUuid(id), {
            id,
            swarmId: event.swarmId ?? null,
            agentId: event.agentId ?? null,
            eventType: event.eventType,
            eventName: event.eventName,
            eventData: event.eventData ? JSON.stringify(event.eventData) : null,
            severity: event.severity,
            createdAt: now.getTime()
        });
        return id;
    }
    async getEvents(filters, limit = 100) {
        const must = [];
        if (filters.swarmId) {
            must.push({
                key: 'swarmId',
                match: {
                    value: filters.swarmId
                }
            });
        }
        if (filters.agentId) {
            must.push({
                key: 'agentId',
                match: {
                    value: filters.agentId
                }
            });
        }
        if (filters.severity) {
            must.push({
                key: 'severity',
                match: {
                    value: filters.severity
                }
            });
        }
        if (filters.eventType) {
            must.push({
                key: 'eventType',
                match: {
                    value: filters.eventType
                }
            });
        }
        if (filters.since) {
            must.push({
                key: 'createdAt',
                range: {
                    gte: filters.since.getTime()
                }
            });
        }
        const result = await this.scroll(this.collections.events, must.length > 0 ? {
            must
        } : undefined, limit);
        return result.points.map((p)=>({
                id: p.payload.id,
                swarmId: p.payload.swarmId,
                agentId: p.payload.agentId,
                eventType: p.payload.eventType,
                eventName: p.payload.eventName,
                eventData: p.payload.eventData ? JSON.parse(p.payload.eventData) : undefined,
                severity: p.payload.severity,
                createdAt: new Date(p.payload.createdAt)
            }));
    }
    async searchEvents(query, embedding, limit = 10) {
        const results = await this.search(this.collections.events, embedding, undefined, limit);
        return results.map((r)=>({
                id: r.payload.id,
                swarmId: r.payload.swarmId,
                agentId: r.payload.agentId,
                eventType: r.payload.eventType,
                eventName: r.payload.eventName,
                eventData: r.payload.eventData ? JSON.parse(r.payload.eventData) : undefined,
                severity: r.payload.severity,
                createdAt: new Date(r.payload.createdAt)
            }));
    }
    async storePattern(pattern, embedding) {
        const id = nanoid();
        const now = Date.now();
        await this.upsert(this.collections.patterns, this.stringToUuid(id), {
            id,
            patternType: pattern.patternType,
            content: pattern.content,
            context: JSON.stringify(pattern.context),
            effectiveness: pattern.effectiveness,
            occurrences: pattern.occurrences,
            createdAt: now,
            updatedAt: now
        }, embedding);
        return id;
    }
    async searchSimilarPatterns(embedding, limit = 10) {
        const results = await this.search(this.collections.patterns, embedding, undefined, limit);
        return results.map((r)=>({
                id: r.payload.id,
                patternType: r.payload.patternType,
                content: r.payload.content,
                context: JSON.parse(r.payload.context),
                effectiveness: r.payload.effectiveness,
                occurrences: r.payload.occurrences,
                createdAt: r.payload.createdAt,
                updatedAt: r.payload.updatedAt
            }));
    }
    async updatePatternEffectiveness(id, effectiveness, incrementOccurrences = true) {
        const payload = await this.getPoint(this.collections.patterns, this.stringToUuid(id));
        if (!payload) throw new Error(`Pattern ${id} not found`);
        await this.upsert(this.collections.patterns, this.stringToUuid(id), {
            ...payload,
            effectiveness,
            occurrences: incrementOccurrences ? payload.occurrences + 1 : payload.occurrences,
            updatedAt: Date.now()
        });
    }
    async memoryStore(key, value, namespace = 'default', options) {
        const now = Date.now();
        const id = `${namespace}:${key}`;
        const existing = await this.getPoint(this.collections.memory, this.stringToUuid(id));
        await this.upsert(this.collections.memory, this.stringToUuid(id), {
            id,
            key,
            value,
            namespace,
            metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            accessedAt: now,
            accessCount: (existing?.accessCount ?? 0) + 1,
            ttl: options?.ttl ?? null,
            expiresAt: options?.ttl ? now + options.ttl * 1000 : null
        });
    }
    async memoryGet(key, namespace = 'default') {
        const id = `${namespace}:${key}`;
        const payload = await this.getPoint(this.collections.memory, this.stringToUuid(id));
        if (!payload) return null;
        if (payload.expiresAt && payload.expiresAt < Date.now()) {
            await this.deletePoints(this.collections.memory, [
                this.stringToUuid(id)
            ]);
            return null;
        }
        await this.upsert(this.collections.memory, this.stringToUuid(id), {
            ...payload,
            accessedAt: Date.now(),
            accessCount: payload.accessCount + 1
        });
        return {
            id: payload.id,
            key: payload.key,
            value: payload.value,
            namespace: payload.namespace,
            metadata: payload.metadata ? JSON.parse(payload.metadata) : undefined,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
            accessedAt: payload.accessedAt,
            accessCount: payload.accessCount,
            ttl: payload.ttl,
            expiresAt: payload.expiresAt
        };
    }
    async memoryDelete(key, namespace = 'default') {
        const id = `${namespace}:${key}`;
        await this.deletePoints(this.collections.memory, [
            this.stringToUuid(id)
        ]);
    }
    async memoryList(namespace = 'default', limit = 100) {
        const now = Date.now();
        const filter = {
            must: [
                {
                    key: 'namespace',
                    match: {
                        value: namespace
                    }
                }
            ],
            should: [
                {
                    is_null: {
                        key: 'expiresAt'
                    }
                },
                {
                    key: 'expiresAt',
                    range: {
                        gt: now
                    }
                }
            ]
        };
        const result = await this.scroll(this.collections.memory, filter, limit);
        return result.points.map((p)=>({
                id: p.payload.id,
                key: p.payload.key,
                value: p.payload.value,
                namespace: p.payload.namespace,
                metadata: p.payload.metadata ? JSON.parse(p.payload.metadata) : undefined,
                createdAt: p.payload.createdAt,
                updatedAt: p.payload.updatedAt,
                accessedAt: p.payload.accessedAt,
                accessCount: p.payload.accessCount,
                ttl: p.payload.ttl,
                expiresAt: p.payload.expiresAt
            }));
    }
    async memoryCleanupExpired() {
        const now = Date.now();
        const filter = {
            must: [
                {
                    key: 'expiresAt',
                    range: {
                        lt: now
                    }
                }
            ]
        };
        const result = await this.scroll(this.collections.memory, filter, 1000);
        if (result.points.length === 0) return 0;
        const ids = result.points.map((p)=>this.stringToUuid(p.payload.id));
        await this.deletePoints(this.collections.memory, ids);
        return ids.length;
    }
    async recordMetric(metric) {
        const id = nanoid();
        const now = new Date();
        await this.upsert(this.collections.events, this.stringToUuid(id), {
            id,
            eventType: 'metric',
            eventName: metric.metricName,
            swarmId: metric.swarmId ?? null,
            agentId: metric.agentId ?? null,
            severity: 'info',
            eventData: JSON.stringify({
                metricType: metric.metricType,
                metricValue: metric.metricValue,
                unit: metric.unit,
                metadata: metric.metadata
            }),
            createdAt: now.getTime()
        });
        return id;
    }
    async getMetrics(filters, limit = 100) {
        const must = [
            {
                key: 'eventType',
                match: {
                    value: 'metric'
                }
            }
        ];
        if (filters.swarmId) {
            must.push({
                key: 'swarmId',
                match: {
                    value: filters.swarmId
                }
            });
        }
        if (filters.agentId) {
            must.push({
                key: 'agentId',
                match: {
                    value: filters.agentId
                }
            });
        }
        if (filters.since) {
            must.push({
                key: 'createdAt',
                range: {
                    gte: filters.since.getTime()
                }
            });
        }
        const result = await this.scroll(this.collections.events, {
            must
        }, limit);
        return result.points.map((p)=>{
            const data = JSON.parse(p.payload.eventData);
            if (filters.metricType && data.metricType !== filters.metricType) {
                return null;
            }
            return {
                id: p.payload.id,
                swarmId: p.payload.swarmId,
                agentId: p.payload.agentId,
                metricType: data.metricType,
                metricName: p.payload.eventName,
                metricValue: data.metricValue,
                unit: data.unit,
                timestamp: new Date(p.payload.createdAt),
                metadata: data.metadata
            };
        }).filter((m)=>m !== null);
    }
    async cleanup() {
        const expired = await this.memoryCleanupExpired();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const filter = {
            must: [
                {
                    key: 'createdAt',
                    range: {
                        lt: thirtyDaysAgo
                    }
                }
            ]
        };
        const result = await this.scroll(this.collections.events, filter, 1000);
        if (result.points.length > 0) {
            const ids = result.points.map((p)=>this.stringToUuid(p.payload.id));
            await this.deletePoints(this.collections.events, ids);
        }
        return {
            expired,
            oldEvents: result.points.length
        };
    }
}
let _adapter = null;
export function getQdrantAdapter(config) {
    if (!_adapter) {
        _adapter = new QdrantCoordinationAdapter(config);
    }
    return _adapter;
}
export function resetQdrantAdapter() {
    _adapter = null;
}

//# sourceMappingURL=qdrant-adapter.js.map