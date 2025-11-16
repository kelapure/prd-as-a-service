import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { evaluatePRD } from "../lib/api";
import { extractTextFromFile, validatePRDText } from "../lib/fileReader";
import type { BinaryScoreOutput } from "../types/api";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (results: {
    binaryScore: BinaryScoreOutput;
    prdText: string;
  }) => void;
}

export function UploadDialog({ open, onOpenChange, onComplete }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [streamPreview, setStreamPreview] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgressMessage("Reading file...");
    setProgressPercent(10);

    try {
      // Step 1: Extract text from file
      const prdText = await extractTextFromFile(file);
      setProgressPercent(30);

      // Step 2: Validate content
      const validation = validatePRDText(prdText);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Step 3: Evaluate PRD (binary score only) with streaming
      setProgressMessage("Evaluating PRD against 11 criteria...");
      setProgressPercent(30);
      setStreamPreview(""); // Reset preview
      let accumulatedText = "";
      const binaryScore = await evaluatePRD(prdText, (delta, accumulatedLength) => {
        // Update progress based on accumulated characters
        // Estimate: typical response is ~3000 chars
        const progress = 30 + Math.min((accumulatedLength / 3000) * 70, 70);
        setProgressPercent(progress);
        // Accumulate the text locally and show last 200 chars
        accumulatedText += delta;
        setStreamPreview(accumulatedText.slice(-200));
      });

      // Success! Close dialog and pass results + prdText for background processing
      setProgressPercent(100);
      setUploading(false);
      onOpenChange(false);
      onComplete({ binaryScore, prdText });

      // Reset
      setFile(null);
      setProgressMessage("");
      setProgressPercent(0);
      setStreamPreview("");

    } catch (err) {
      setUploading(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setProgressMessage("");
      setProgressPercent(0);
      setStreamPreview("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="dialog-title text-foreground">Upload Your PRD</DialogTitle>
          <DialogDescription>
            Upload your Product Requirements Document for evaluation against our 11-point rubric.
            <br />
            <span className="text-chart-2 font-medium">🔒 Your PRD is processed in-memory only and is never stored on our servers.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-[var(--radius-card)] p-12 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}
              ${file ? 'border-chart-2 bg-chart-2/5' : ''}
            `}
          >
            {!file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-foreground">
                    Drop your PRD here
                  </p>
                  <p className="text-muted-foreground">
                    or click to browse
                  </p>
                </div>
                <input
                  type="file"
                  onChange={handleChange}
                  accept=".pdf,.doc,.docx,.txt,.md"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-chart-2/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-chart-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-foreground">
                      {file.name}
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="mx-auto"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Progress Display */}
          {uploading && progressMessage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progressMessage}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {streamPreview && (
                <div className="rounded-md bg-muted/50 p-2 max-h-20 overflow-auto">
                  <code className="text-xs text-muted-foreground break-all">
                    {streamPreview}
                  </code>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                This may take about 1 minute. Additional analysis will continue in the background.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/90">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setError(null);
                setFile(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Evaluate PRD
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}