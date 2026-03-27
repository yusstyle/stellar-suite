import { useState } from 'react';
import { Circle, Square, Download, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useInteractionRecorder } from '@/hooks/useInteractionRecorder';
import { toast } from 'sonner';

export function InteractionRecorder() {
  const {
    isRecording,
    currentSession,
    startRecording,
    stopRecording,
    exportSession,
  } = useInteractionRecorder();

  const [showNameDialog, setShowNameDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [exportFormat, setExportFormat] = useState<'bash' | 'json'>('bash');

  const handleStartRecording = async () => {
    if (sessionName.trim()) {
      try {
        await startRecording(sessionName);
        toast.success(`Recording started: ${sessionName}`);
        setShowNameDialog(false);
        setSessionName('');
      } catch (error) {
        toast.error('Failed to start recording');
      }
    } else {
      try {
        await startRecording();
        toast.success('Recording started');
      } catch (error) {
        toast.error('Failed to start recording');
      }
    }
  };

  const handleStopRecording = async () => {
    try {
      const session = await stopRecording();
      if (session) {
        toast.success(`Recording stopped: ${session.interactions.length} interaction(s) captured`);
      }
    } catch (error) {
      toast.error('Failed to stop recording');
    }
  };

  const handleExport = () => {
    if (currentSession) {
      try {
        exportSession(currentSession, {
          format: exportFormat,
          includeAssertions: true,
          includeComments: true,
        });
        toast.success(`Exported as ${exportFormat.toUpperCase()} script`);
      } catch (error) {
        toast.error('Failed to export session');
      }
    }
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - start) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-3 p-3 border-t border-border bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 fill-red-500 text-red-500 animate-pulse" />
              <span className="text-xs font-medium text-foreground">Recording</span>
            </div>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Interaction Recorder</span>
          )}
        </div>

        {!isRecording ? (
          <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Circle className="h-3 w-3 mr-1" />
                Record
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Recording Session</DialogTitle>
                <DialogDescription>
                  Give your recording session a name (optional)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="session-name">Session Name</Label>
                  <Input
                    id="session-name"
                    placeholder="e.g., Token Transfer Flow"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void handleStartRecording();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNameDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStartRecording}>
                  Start Recording
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            onClick={handleStopRecording}
          >
            <Square className="h-3 w-3 mr-1 fill-current" />
            Stop
          </Button>
        )}
      </div>

      {isRecording && currentSession && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-red-800 dark:text-red-200">
                {currentSession.name}
              </p>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(currentSession.startedAt)}
              </Badge>
            </div>
            <p className="text-xs text-red-700 dark:text-red-300">
              {currentSession.interactions.length} interaction(s) recorded
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'bash' | 'json')}
              className="flex-1 h-7 text-xs bg-background border border-border rounded px-2"
            >
              <option value="bash">Bash Script</option>
              <option value="json">JSON Scenario</option>
            </select>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleExport}
              disabled={currentSession.interactions.length === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>

          <p className="text-xs text-muted-foreground italic">
            All contract calls will be captured automatically
          </p>
        </div>
      )}
    </div>
  );
}
