import { describe, it, expect } from 'vitest';
import { cliScriptGenerator } from '../cliScriptGenerator';
import type { RecordingSession } from '../interactionRecorder';

describe('CLIScriptGenerator', () => {
  const mockSession: RecordingSession = {
    id: 'session-123',
    name: 'Test Session',
    startedAt: '2026-03-27T12:00:00.000Z',
    endedAt: '2026-03-27T12:05:00.000Z',
    interactions: [
      {
        id: 'int-1',
        timestamp: '2026-03-27T12:01:00.000Z',
        contractId: 'CCABC123XYZ',
        functionName: 'initialize',
        args: '[]',
        argsArray: [],
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        signerPublicKey: 'GABC123XYZ',
        signerType: 'local-keypair',
        isSimulation: false,
        result: {
          success: true,
          output: 'Success',
        },
      },
      {
        id: 'int-2',
        timestamp: '2026-03-27T12:02:00.000Z',
        contractId: 'CCABC123XYZ',
        functionName: 'transfer',
        args: '["GDEF456", "1000"]',
        argsArray: ['GDEF456', '1000'],
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        signerPublicKey: 'GABC123XYZ',
        signerType: 'local-keypair',
        isSimulation: false,
        result: {
          success: true,
          output: 'Transfer successful',
        },
      },
    ],
    metadata: {
      network: 'testnet',
      contractIds: ['CCABC123XYZ'],
      totalInteractions: 2,
    },
  };

  describe('generateScript', () => {
    it('should generate bash script by default', () => {
      const script = cliScriptGenerator.generateScript(mockSession);

      expect(script.format).toBe('bash');
      expect(script.filename).toContain('.sh');
      expect(script.content).toContain('#!/bin/bash');
    });

    it('should generate JSON scenario when specified', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'json',
        includeAssertions: true,
        includeComments: true,
      });

      expect(script.format).toBe('json');
      expect(script.filename).toContain('.json');
      
      const parsed = JSON.parse(script.content);
      expect(parsed.name).toBe('Test Session');
      expect(parsed.interactions).toHaveLength(2);
    });
  });

  describe('bash script generation', () => {
    it('should include shebang and error handling', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'bash',
        includeAssertions: true,
        includeComments: true,
      });

      expect(script.content).toContain('#!/bin/bash');
      expect(script.content).toContain('set -e');
    });

    it('should include session metadata in comments', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'bash',
        includeAssertions: true,
        includeComments: true,
      });

      expect(script.content).toContain('# Recorded Interaction Session: Test Session');
      expect(script.content).toContain('# Network: testnet');
      expect(script.content).toContain('# Total Interactions: 2');
    });

    it('should define contract variables', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'bash',
        includeAssertions: true,
        includeComments: true,
      });

      expect(script.content).toContain('CONTRACT_1="CCABC123XYZ"');
    });

    it('should include stellar CLI check', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'bash',
        includeAssertions: true,
        includeComments: true,
      });

      expect(script.content).toContain('if ! command -v stellar');
      expect(script.content).toContain('stellar CLI is not installed');
    });

    it('should generate stellar CLI commands', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'bash',
        includeAssertions: true,
        includeComments: true,
      });

      expect(script.content).toContain('stellar');
      expect(script.content).toContain('contract');
      expect(script.content).toContain('invoke');
      expect(script.content).toContain('--id $CONTRACT_1');
      expect(script.content).toContain('--network testnet');
      expect(script.content).toContain('-- initialize');
      expect(script.content).toContain('-- transfer');
    });

    it('should include assertions when enabled', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'bash',
        includeAssertions: true,
        includeComments: true,
      });

      expect(script.content).toContain('# Assert:');
      expect(script.content).toContain('if [ $? -ne 0 ]');
    });

    it('should exclude assertions when disabled', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'bash',
        includeAssertions: false,
        includeComments: true,
      });

      expect(script.content).not.toContain('# Assert:');
      expect(script.content).not.toContain('if [ $? -ne 0 ]');
    });

    it('should exclude comments when disabled', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'bash',
        includeAssertions: true,
        includeComments: false,
      });

      expect(script.content).not.toContain('# Recorded Interaction Session');
      expect(script.content).not.toContain('# Interaction 1:');
    });
  });

  describe('JSON scenario generation', () => {
    it('should generate valid JSON', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'json',
        includeAssertions: true,
        includeComments: true,
      });

      const parsed = JSON.parse(script.content);
      expect(parsed).toBeDefined();
    });

    it('should include session metadata', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'json',
        includeAssertions: true,
        includeComments: true,
      });

      const parsed = JSON.parse(script.content);
      expect(parsed.name).toBe('Test Session');
      expect(parsed.network).toBe('testnet');
    });

    it('should map contract IDs to references', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'json',
        includeAssertions: true,
        includeComments: true,
      });

      const parsed = JSON.parse(script.content);
      expect(parsed.contracts).toHaveLength(1);
      expect(parsed.contracts[0].id).toBe('contract_1');
      expect(parsed.contracts[0].address).toBe('CCABC123XYZ');
    });

    it('should include interaction details', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'json',
        includeAssertions: true,
        includeComments: true,
      });

      const parsed = JSON.parse(script.content);
      expect(parsed.interactions).toHaveLength(2);
      expect(parsed.interactions[0].function).toBe('initialize');
      expect(parsed.interactions[1].function).toBe('transfer');
    });

    it('should include expected results when assertions enabled', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'json',
        includeAssertions: true,
        includeComments: true,
      });

      const parsed = JSON.parse(script.content);
      expect(parsed.interactions[0].expectedResult).toBeDefined();
      expect(parsed.interactions[0].expectedResult.success).toBe(true);
    });

    it('should exclude expected results when assertions disabled', () => {
      const script = cliScriptGenerator.generateScript(mockSession, {
        format: 'json',
        includeAssertions: false,
        includeComments: true,
      });

      const parsed = JSON.parse(script.content);
      expect(parsed.interactions[0].expectedResult).toBeUndefined();
    });
  });

  describe('generateReadme', () => {
    it('should generate README with session info', () => {
      const readme = cliScriptGenerator.generateReadme(mockSession);

      expect(readme).toContain('# Test Session');
      expect(readme).toContain('## Overview');
      expect(readme).toContain('2 contract interaction(s)');
    });

    it('should include prerequisites', () => {
      const readme = cliScriptGenerator.generateReadme(mockSession);

      expect(readme).toContain('## Prerequisites');
      expect(readme).toContain('Stellar CLI installed');
      expect(readme).toContain('Network: testnet');
    });

    it('should list all contracts', () => {
      const readme = cliScriptGenerator.generateReadme(mockSession);

      expect(readme).toContain('## Contracts');
      expect(readme).toContain('CCABC123XYZ');
    });

    it('should document each interaction', () => {
      const readme = cliScriptGenerator.generateReadme(mockSession);

      expect(readme).toContain('## Interactions');
      expect(readme).toContain('### 1. initialize');
      expect(readme).toContain('### 2. transfer');
    });
  });
});
