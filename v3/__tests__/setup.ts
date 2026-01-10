/**
 * V3 Test Setup
 * Global test configuration for Vitest
 */

import { beforeAll, afterAll, vi } from 'vitest';

// Disable agentic-flow health server during tests to avoid port conflicts
// Multiple test workers would otherwise try to bind to the same port (8080)
process.env.AGENTIC_FLOW_DISABLE_HEALTH_SERVER = 'true';
process.env.AGENTIC_FLOW_HEALTH_PORT = '0'; // Use random available port

// Mock console.warn for cleaner test output
beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Increase timeout for integration tests
vi.setConfig({
  testTimeout: 30000,
});
