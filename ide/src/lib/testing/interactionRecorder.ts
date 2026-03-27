import { get, set } from 'idb-keyval';

export interface RecordedInteraction {
  id: string;
  timestamp: string;
  contractId: string;
  functionName: string;
  args: string;
  argsArray: unknown[];
  network: string;
  networkPassphrase: string;
  rpcUrl: string;
  signerPublicKey: string;
  signerType: 'local-keypair' | 'web-wallet';
  isSimulation: boolean;
  result?: {
    success: boolean;
    output: string;
    hash?: string;
    error?: string;
  };
}

export interface RecordingSession {
  id: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  interactions: RecordedInteraction[];
  metadata: {
    network: string;
    contractIds: string[];
    totalInteractions: number;
  };
}

class InteractionRecorder {
  private isRecording = false;
  private currentSession: RecordingSession | null = null;
  private readonly RECORDING_KEY = 'interaction-recording-session';
  private readonly SESSIONS_KEY = 'interaction-recording-sessions';

  /**
   * Start a new recording session
   */
  async startRecording(sessionName?: string): Promise<void> {
    const sessionId = `session-${Date.now()}`;
    const name = sessionName || `Recording ${new Date().toLocaleString()}`;

    this.currentSession = {
      id: sessionId,
      name,
      startedAt: new Date().toISOString(),
      interactions: [],
      metadata: {
        network: '',
        contractIds: [],
        totalInteractions: 0,
      },
    };

    this.isRecording = true;
    await set(this.RECORDING_KEY, this.currentSession);
  }

  /**
   * Stop the current recording session
   */
  async stopRecording(): Promise<RecordingSession | null> {
    if (!this.currentSession) {
      return null;
    }

    this.currentSession.endedAt = new Date().toISOString();
    this.currentSession.metadata.totalInteractions = this.currentSession.interactions.length;

    // Save to sessions list
    await this.saveSession(this.currentSession);

    const session = this.currentSession;
    this.currentSession = null;
    this.isRecording = false;
    await set(this.RECORDING_KEY, null);

    return session;
  }

  /**
   * Record a contract interaction
   */
  async recordInteraction(interaction: Omit<RecordedInteraction, 'id' | 'timestamp'>): Promise<void> {
    if (!this.isRecording || !this.currentSession) {
      return;
    }

    const recordedInteraction: RecordedInteraction = {
      ...interaction,
      id: `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.currentSession.interactions.push(recordedInteraction);

    // Update metadata
    if (!this.currentSession.metadata.contractIds.includes(interaction.contractId)) {
      this.currentSession.metadata.contractIds.push(interaction.contractId);
    }
    this.currentSession.metadata.network = interaction.network;

    await set(this.RECORDING_KEY, this.currentSession);
  }

  /**
   * Check if currently recording
   */
  getRecordingStatus(): boolean {
    return this.isRecording;
  }

  /**
   * Get current recording session
   */
  getCurrentSession(): RecordingSession | null {
    return this.currentSession;
  }

  /**
   * Save a session to the sessions list
   */
  private async saveSession(session: RecordingSession): Promise<void> {
    const sessions = await this.getAllSessions();
    sessions.push(session);
    await set(this.SESSIONS_KEY, sessions);
  }

  /**
   * Get all saved recording sessions
   */
  async getAllSessions(): Promise<RecordingSession[]> {
    const sessions = await get<RecordingSession[]>(this.SESSIONS_KEY);
    return sessions || [];
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<RecordingSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await set(this.SESSIONS_KEY, filtered);
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    await set(this.SESSIONS_KEY, []);
  }

  /**
   * Resume a recording session from storage (e.g., after page refresh)
   */
  async resumeRecording(): Promise<boolean> {
    const session = await get<RecordingSession>(this.RECORDING_KEY);
    if (session && !session.endedAt) {
      this.currentSession = session;
      this.isRecording = true;
      return true;
    }
    return false;
  }
}

// Singleton instance
export const interactionRecorder = new InteractionRecorder();
