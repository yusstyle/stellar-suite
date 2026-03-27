import { useEffect, useState } from 'react';
import { Trash2, Download, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInteractionRecorder } from '@/hooks/useInteractionRecorder';
import type { RecordingSession } from '@/lib/testing/interactionRecorder';

export function RecordingSessionsViewer() {
  const {
    sessions,
    loadSessions,
    deleteSession,
    clearAllSessions,
    exportSession,
    generateScript,
  } = useInteractionRecorder();

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'bash' | 'json'>('bash');
  const [previewContent, setPreviewContent] = useState<string>('');

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (selectedSession) {
      const session = sessions.find(s => s.id === selectedSession);
      if (session) {
        const script = generateScript(session, {
          format: exportFormat,
          includeAssertions: true,
          includeComments: true,
        });
        setPreviewContent(script.content);
      }
    }
  }, [selectedSession, exportFormat, sessions, generateScript]);

  const handleExport = (session: RecordingSession) => {
    exportSession(session, {
      format: exportFormat,
      includeAssertions: true,
      includeComments: true,
    });
  };

  const handleDelete = async (sessionId: string) => {
    await deleteSession(sessionId);
    if (selectedSession === sessionId) {
      setSelectedSession(null);
    }
  };

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const formatDuration = (startedAt: string, endedAt?: string) => {
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recording Sessions</CardTitle>
              <CardDescription>
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} saved
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={sessions.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Sessions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {sessions.length} recording session(s). This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllSessions}>
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recording sessions found</p>
                  <p className="text-xs mt-1">Start recording to capture interactions</p>
                </div>
              ) : (
                sessions.map((session) => {
                  const isSelected = selectedSession === session.id;

                  return (
                    <div
                      key={session.id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-accent border-primary'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setSelectedSession(session.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {session.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {session.metadata.totalInteractions} calls
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {session.metadata.network}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(session.startedAt, session.endedAt)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(session.startedAt)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport(session);
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{session.name}" and all its recorded interactions.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(session.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Session Preview</CardTitle>
              <CardDescription>
                {selectedSessionData
                  ? selectedSessionData.name
                  : 'Select a session to preview'}
              </CardDescription>
            </div>
            {selectedSessionData && (
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'bash' | 'json')}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bash">Bash</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          {selectedSessionData ? (
            <Tabs defaultValue="script" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="script">Script</TabsTrigger>
                <TabsTrigger value="interactions">Interactions</TabsTrigger>
              </TabsList>

              <TabsContent value="script" className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <pre className="text-xs font-mono p-4 bg-muted rounded-md">
                    {previewContent}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="interactions" className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {selectedSessionData.interactions.map((interaction, index) => (
                      <div
                        key={interaction.id}
                        className="p-3 border rounded-md bg-background"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold">
                              {index + 1}. {interaction.functionName}
                            </span>
                            {interaction.result && (
                              interaction.result.success ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )
                            )}
                          </div>
                          <Badge variant={interaction.isSimulation ? 'secondary' : 'default'} className="text-xs">
                            {interaction.isSimulation ? 'Simulation' : 'Write'}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>Contract: {interaction.contractId.substring(0, 12)}...</p>
                          {interaction.argsArray.length > 0 && (
                            <p>Args: {JSON.stringify(interaction.argsArray)}</p>
                          )}
                          <p>Signer: {interaction.signerPublicKey.substring(0, 8)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <FileText className="h-12 w-12 opacity-50" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
