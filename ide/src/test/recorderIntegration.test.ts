import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { interactionRecorder } from '@/lib/testing/interactionRecorder';
import { cliScriptGenerator } from '@/lib/testing/cliScriptGenerator';

describe('Interaction Recorder Integration', () => {
  beforeEach(async () => {
    await interactionRecorder.clearAllSessions();
  });

  afterEach(async () => {
    if (interactionRecorder.getRecordingStatus()) {
      await interactionRecorder.stopRecording();
    }
    await interactionRecorder.clearAllSessions();
  });

  it('should record and export a complete workflow', async () => {
    await interactionRecorder.startRecording('Complete Flow');

    await interactionRecorder.recordInteraction({
      contractId: 'CCTEST123',
      functionName: 'initialize',
      args: '[]',
      argsArray: [],
      network: 'testnet',
      networkPassphrase: 'Test SDF Network ; September 2015',
      rpcUrl: 'https://soroban-testnet.stellar.org',
      signerPublicKey: 'GTEST123',
      signerType: 'local-keypair',
      isSimulation: false,
      result: { success: true, output: 'OK' },
    });

    const session = await interactionRecorder.stopRecording();
    const bashScript = cliScriptGenerator.generateScript(session!, { format: 'bash', includeAssertions: true, includeComments: true });
    const jsonScript = cliScriptGenerator.generateScript(session!, { format: 'json', includeAssertions: true, includeComments: true });

    expect(bashScript.content).toContain('stellar');
    expect(jsonScript.content).toContain('CCTEST123');
  });
});
