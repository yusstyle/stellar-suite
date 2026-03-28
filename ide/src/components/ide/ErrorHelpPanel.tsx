"use client";

import React from "react";
import { X, ExternalLink, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ErrorHelpPanelProps {
  errorCode: string;
  onClose: () => void;
}

interface ErrorHelpData {
  title: string;
  description: string;
  commonCauses: string[];
  fixExample: string;
  stellarDocs: string | null;
  rustDocs: string | null;
}

const ErrorHelpPanel: React.FC<ErrorHelpPanelProps> = ({ errorCode, onClose }) => {
  const [errorData, setErrorData] = React.useState<ErrorHelpData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadErrorData = async () => {
      try {
        const response = await fetch("/api/error-help");
        const data = await response.json();
        const error = data.errors[errorCode];
        
        if (error) {
          setErrorData(error);
        } else {
          setErrorData(null);
        }
      } catch (error) {
        console.error("Failed to load error help data:", error);
        setErrorData(null);
      } finally {
        setLoading(false);
      }
    };

    loadErrorData();
  }, [errorCode]);

  if (loading) {
    return (
      <div className="h-full bg-[#1e1e2e] border-l border-border flex items-center justify-center">
        <div className="text-muted-foreground">Loading help...</div>
      </div>
    );
  }

  if (!errorData) {
    return (
      <div className="h-full bg-[#1e1e2e] border-l border-border flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Error Help</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Close help panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                No Help Available
              </CardTitle>
              <CardDescription>
                Error code: <Badge variant="outline">{errorCode}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                We don't have specific help for this error yet, but here are some resources:
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open("https://developers.stellar.org/docs", "_blank")}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Stellar Documentation
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open("https://doc.rust-lang.org/error-index.html", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Rust Error Index
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#1e1e2e] border-l border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Error Help</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
          aria-label="Close help panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Error Code Badge */}
          <div>
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {errorCode}
            </Badge>
          </div>

          {/* Title */}
          <div>
            <h3 className="text-2xl font-bold mb-2">{errorData.title}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {errorData.description}
            </p>
          </div>

          <Separator />

          {/* Common Causes */}
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Common Causes
            </h4>
            <ul className="space-y-2">
              {errorData.commonCauses.map((cause, index) => (
                <li key={index} className="flex gap-2 text-sm">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-muted-foreground">{cause}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Fix Example */}
          <div>
            <h4 className="text-lg font-semibold mb-3">How to Fix</h4>
            <Card className="bg-[#181825]">
              <CardContent className="p-4">
                <pre className="text-xs overflow-x-auto">
                  <code className="text-green-400">{errorData.fixExample}</code>
                </pre>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Documentation Links */}
          <div>
            <h4 className="text-lg font-semibold mb-3">Learn More</h4>
            <div className="space-y-2">
              {errorData.stellarDocs && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(errorData.stellarDocs!, "_blank")}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Stellar Developer Docs
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              )}
              {errorData.rustDocs && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(errorData.rustDocs!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Rust Error Index
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ErrorHelpPanel;
