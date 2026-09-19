"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";

export function UploadModal({
  handleUpload,
  uploadProgress,
  isUploading,
}: {
  handleUpload: (files: File[]) => void;
  uploadProgress: number;
  isUploading: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length) await handleUpload(files);
  }, [handleUpload]);

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-paper/50 p-12 transition-all hover:border-amber-400 hover:bg-buttercup/10/30",
        isDragging && "border-primary bg-buttercup/10 ring-4 ring-buttercup/40",
        isUploading && "pointer-events-none opacity-80"
      )}
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-100 transition-transform group-hover:scale-110">
        <UploadCloud className={cn("h-10 w-10 text-muted-foreground transition-colors group-hover:text-primary", isDragging && "text-primary")} />
      </div>

      {isUploading ? (
        <div className="w-full max-w-xs space-y-4 text-center">
          <Progress value={uploadProgress} className="h-2 w-full bg-muted [&>div]:bg-buttercup/100" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {uploadProgress < 100 ? "Uploading photos..." : "Processing..."}
          </p>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div>
            <p className="text-lg font-display font-medium text-violet-deep">
              Drag & drop photos here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
          
          <Button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.multiple = true;
              input.onchange = async () => {
                if (input.files?.length)
                  await handleUpload(Array.from(input.files));
              };
              input.click();
            }}
            className="rounded-full bg-primary px-8 hover:bg-violet-deep"
          >
            Select Photos
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Supports JPG, PNG, WEBP • Max 50 files
          </p>
        </div>
      )}
    </div>
  );
}
