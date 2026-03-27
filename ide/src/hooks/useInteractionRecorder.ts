import { useState, useEffect, useCallback } from 'react';
import {
  interactionRecorder,
  type RecordingSession,
  type RecordedInteraction,
} from '@/lib/testing/interactionRecorder';
import {
  cliScriptGenerator,
  type CLIScriptOptions,
  type GeneratedScript,
} from '@/lib/testing/cliScriptGenerator';

export function useInteractionRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const [sessions, setSessions] = useState<RecordingSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    // Check if there's an active recording session
    void resumeRecording();
  }, []);

  // Sync recording status
  useEffect(() => {
    const checkStatus = () => {
      setIsRecording(interactionRecorder.getRecordingStatus());
      setCurrentSession(interactionRecorder.getCurrentSession());
    };

    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const allSessions = await interactionRecorder.getAllSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startRecording = useCallback(async (sessionName?: string) => {
    try {
      await interactionRecorder.startRecording(sessionName);
      setIsRecording(true);
      setCurrentSession(interactionRecorder.getCurrentSession());
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      const session = await interactionRecorder.stopRecording();
      setIsRecording(false);
      setCurrentSession(null);
      await loadSessions();
      return session;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }, [loadSessions]);

  const recordInteraction = useCallback(
    async (interaction: Omit<RecordedInteraction, 'id' | 'timestamp'>) => {
      try {
        await interactionRecorder.recordInteraction(interaction);
        setCurrentSession(interactionRecorder.getCurrentSession());
      } catch (error) {
        console.error('Failed to record interaction:', error);
      }
    },
    []
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await interactionRecorder.deleteSession(sessionId);
        await loadSessions();
      } catch (error) {
        console.error('Failed to delete session:', error);
        throw error;
      }
    },
    [loadSessions]
  );

  const clearAllSessions = useCallback(async () => {
    try {
      await interactionRecorder.clearAllSessions();
      setSessions([]);
    } catch (error) {
      console.error('Failed to clear sessions:', error);
      throw error;
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      const resumed = await interactionRecorder.resumeRecording();
      if (resumed) {
        setIsRecording(true);
        setCurrentSession(interactionRecorder.getCurrentSession());
      }
      return resumed;
    } catch (error) {
      console.error('Failed to resume recording:', error);
      return false;
    }
  }, []);

  const generateScript = useCallback(
    (session: RecordingSession, options?: CLIScriptOptions): GeneratedScript => {
      return cliScriptGenerator.generateScript(session, options);
    },
    []
  );

  const downloadScript = useCallback((script: GeneratedScript) => {
    cliScriptGenerator.downloadScript(script);
  }, []);

  const generateReadme = useCallback((session: RecordingSession): string => {
    return cliScriptGenerator.generateReadme(session);
  }, []);

  const exportSession = useCallback(
    (session: RecordingSession, options?: CLIScriptOptions) => {
      const script = generateScript(session, options);
      downloadScript(script);

      // Also download README
      const readme = generateReadme(session);
      const readmeBlob = new Blob([readme], { type: 'text/markdown' });
      const url = URL.createObjectURL(readmeBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${script.filename.replace(/\.(sh|json)$/, '')}-README.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [generateScript, downloadScript, generateReadme]
  );

  return {
    isRecording,
    currentSession,
    sessions,
    isLoading,
    startRecording,
    stopRecording,
    recordInteraction,
    deleteSession,
    clearAllSessions,
    resumeRecording,
    generateScript,
    downloadScript,
    generateReadme,
    exportSession,
    loadSessions,
  };
}
