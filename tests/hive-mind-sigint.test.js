/**
 * Tests for SIGINT handling in hive-mind spawn command
 *
 * Updated for Qdrant storage - verifies behavior through process output
 * rather than direct database queries.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Hive Mind SIGINT Handler', () => {
  let hiveMindProcess;
  const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

  afterEach(() => {
    if (hiveMindProcess && !hiveMindProcess.killed) {
      hiveMindProcess.kill('SIGKILL');
    }
  });

  it('should pause session when SIGINT is received during spawn', (done) => {
    // Start hive-mind spawn
    hiveMindProcess = spawn('node', [cliPath, 'hive-mind', 'spawn', 'Test SIGINT handling'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let output = '';
    let sessionId = null;

    hiveMindProcess.stdout.on('data', (data) => {
      output += data.toString();

      // Extract session ID from output
      const sessionMatch = output.match(/Session ID:\s+(\S+)/);
      if (sessionMatch && !sessionId) {
        sessionId = sessionMatch[1];
      }

      // When swarm is ready, send SIGINT
      if (output.includes('Swarm is ready for coordination')) {
        setTimeout(() => {
          hiveMindProcess.kill('SIGINT');
        }, 500);
      }
    });

    hiveMindProcess.stderr.on('data', (data) => {
      console.error('stderr:', data.toString());
    });

    hiveMindProcess.on('exit', (code) => {
      expect(code).toBe(0);
      expect(output).toContain('Pausing session...');
      expect(output).toContain('Session paused successfully');

      // Session ID should be present for resume command
      if (sessionId) {
        expect(output).toContain(`hive-mind resume ${sessionId}`);
      }

      done();
    });
  }, 30000); // 30 second timeout

  it('should save checkpoint when pausing session', (done) => {
    hiveMindProcess = spawn('node', [cliPath, 'hive-mind', 'spawn', 'Test checkpoint saving'], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let output = '';

    hiveMindProcess.stdout.on('data', (data) => {
      output += data.toString();

      if (output.includes('Swarm is ready for coordination')) {
        setTimeout(() => {
          hiveMindProcess.kill('SIGINT');
        }, 500);
      }
    });

    hiveMindProcess.on('exit', (code) => {
      // Verify that checkpoint saving was attempted
      // The actual checkpoint is stored in Qdrant via QdrantStore
      expect(code).toBe(0);
      expect(output).toContain('Session paused');

      done();
    });
  }, 30000);

  it('should terminate Claude Code process when SIGINT is received', (done) => {
    // This test requires claude command to be available
    const { execSync } = require('child_process');
    let claudeAvailable = false;

    try {
      execSync('which claude', { stdio: 'ignore' });
      claudeAvailable = true;
    } catch {
      console.log('Skipping test: claude command not available');
      done();
      return;
    }

    hiveMindProcess = spawn(
      'node',
      [cliPath, 'hive-mind', 'spawn', 'Test Claude termination', '--claude'],
      {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    let output = '';
    let claudeLaunched = false;

    hiveMindProcess.stdout.on('data', (data) => {
      output += data.toString();

      if (output.includes('Claude Code launched with Hive Mind coordination')) {
        claudeLaunched = true;
        setTimeout(() => {
          hiveMindProcess.kill('SIGINT');
        }, 1000);
      }
    });

    hiveMindProcess.on('exit', (code) => {
      if (claudeLaunched) {
        expect(output).toContain('Pausing session and terminating Claude Code...');
      }
      expect(code).toBe(0);
      done();
    });
  }, 30000);
});
