import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { interactionRecorder } from '../interactionRecorder';

describe('InteractionRecorder', () => {
  beforeEach(async () => {
    await interactionRecorder.clearAllSessions();
  });

  afterEach(async () => {
    if (interactionRecorder.getRecordingStatus()) {
      await interactionRecorder.stopRecording();
    }
    await interactionRecorder.clearAllSessions();
  });

  describe('startRecording and stopRecording', () => {
    it('should start a recording session', async () => {
      await interactionRecorder.startRecording('Test Session');

      expect(interactionRecorder.getRecordingStatus()).toBe(true);
      const session = interactionRecorder.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.name).toBe('Test Session');
    });

    it('should stop a recording session', async () => {
      await interactionRecorder.startRecording('Test Session');
      const session = await interactionRecorder.stopRecording();

      expect(interactionRecorder.getRecordingStatus()).toBe(false);
      expect(session).not.toBeNull();
      expect(session?.endedAt).toBeDefined();
    });

    it('should generate default name if not provided', async () => {
      await interactionRecorder.startRecording();

      const session = interactionRecorder.getCurrentSession();
      expect(session?.name).toContain('Recording');
    });
  });

  describe('recordInteraction', () => {
    it('should record an interaction during active session', async () => {
      await interactionRecorder.startRecording('Test Session');

      await interactionRecorder.recordInteraction({
        contractId: 'CCABC123',
        functionName: 'transfer',
        args: '["arg1", "arg2"]',
        argsArray: ['arg1', 'arg2'],
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        signerPublicKey: 'GABC123',
        signerType: 'local-keypair',
        isSimulation: false,
      });

      const session = interactionRecorder.getCurrentSession();
      expect(session?.interactions).toHaveLength(1);
      expect(session?.interactions[0].functionName).toBe('transfer');
    });

    it('should not record when not recording', async () => {
      await interactionRecorder.recordInteraction({
        contractId: 'CCABC123',
        functionName: 'transfer',
        args: '[]',
        argsArray: [],
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        signerPublicKey: 'GABC123',
        signerType: 'local-keypair',
        isSimulation: false,
      });

      const session = interactionRecorder.getCurrentSession();
      expect(session).toBeNull();
    });

    it('should record multiple interactions', async () => {
      await interactionRecorder.startRecording('Multi Test');

      await interactionRecorder.recordInteraction({
        contractId: 'CCABC123',
        functionName: 'initialize',
        args: '[]',
        argsArray: [],
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        signerPublicKey: 'GABC123',
        signerType: 'local-keypair',
        isSimulation: false,
      });

      await interactionRecorder.recordInteraction({
        contractId: 'CCABC123',
        functionName: 'transfer',
        args: '["100"]',
        argsArray: ['100'],
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        signerPublicKey: 'GABC123',
        signerType: 'local-keypair',
        isSimulation: false,
      });

      const session = interactionRecorder.getCurrentSession();
      expect(session?.interactions).toHaveLength(2);
    });

    it('should update metadata with contract IDs', async () => {
      await interactionRecorder.startRecording('Metadata Test');

      await interactionRecorder.recordInteraction({
        contractId: 'CCABC123',
        functionName: 'fn1',
        args: '[]',
        argsArray: [],
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        signerPublicKey: 'GABC123',
        signerType: 'local-keypair',
        isSimulation: false,
      });

      await interactionRecorder.recordInteraction({
        contractId: 'CCDEF456',
        functionName: 'fn2',
        args: '[]',
        argsArray: [],
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        signerPublicKey: 'GABC123',
        signerType: 'local-keypair',
        isSimulation: false,
      });

      const session = interactionRecorder.getCurrentSession();
      expect(session?.metadata.contractIds).toHaveLength(2);
      expect(session?.metadata.contractIds).toContain('CCABC123');
      expect(session?.metadata.contractIds).toContain('CCDEF456');
    });
  });

  describe('session management', () => {
    it('should save session when stopped', async () => {
      await interactionRecorder.startRecording('Save Test');
      await interactionRecorder.recordInteraction({
        contractId: 'CCABC123',
        functionName: 'test',
        args: '[]',
        argsArray: [],
        network: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        signerPublicKey: 'GABC123',
        signerType: 'local-keypair',
        isSimulation: false,
      });

      const session = await interactionRecorder.stopRecording();
      const sessions = await interactionRecorder.getAllSessions();

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(session?.id);
    });

    it('should retrieve session by ID', async () => {
      await interactionRecorder.startRecording('Retrieve Test');
      const stoppedSession = await interactionRecorder.stopRecording();

      const retrieved = await interactionRecorder.getSession(stoppedSession!.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Retrieve Test');
    });

    it('should delete a session', async () => {
      await interactionRecorder.startRecording('Delete Test');
      const session = await interactionRecorder.stopRecording();

      await interactionRecorder.deleteSession(session!.id);
      const sessions = await interactionRecorder.getAllSessions();

      expect(sessions).toHaveLength(0);
    });

    it('should clear all sessions', async () => {
      await interactionRecorder.startRecording('Session 1');
      await interactionRecorder.stopRecording();

      await interactionRecorder.startRecording('Session 2');
      await interactionRecorder.stopRecording();

      let sessions = await interactionRecorder.getAllSessions();
      expect(sessions).toHaveLength(2);

      await interactionRecorder.clearAllSessions();
      sessions = await interactionRecorder.getAllSessions();
      expect(sessions).toHaveLength(0);
    });
  });

  describe('resumeRecording', () => {
    it('should resume an active recording session', async () => {
      await interactionRecorder.startRecording('Resume Test');
      
      // Simulate page refresh by creating new instance behavior
      const resumed = await interactionRecorder.resumeRecording();
      
      expect(resumed).toBe(true);
      expect(interactionRecorder.getRecordingStatus()).toBe(true);
    });

    it('should not resume if no active session', async () => {
      const resumed = await interactionRecorder.resumeRecording();
      expect(resumed).toBe(false);
    });
  });
});
