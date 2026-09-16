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
        "group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-200 bg-stone-50/50 p-12 transition-all hover:border-amber-400 hover:bg-amber-50/30",
        isDragging && "border-amber-500 bg-amber-50 ring-4 ring-amber-100",
        isUploading && "pointer-events-none opacity-80"
      )}
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-100 transition-transform group-hover:scale-110">
        <UploadCloud className={cn("h-10 w-10 text-stone-400 transition-colors group-hover:text-amber-500", isDragging && "text-amber-600")} />
      </div>

      {isUploading ? (
        <div className="w-full max-w-xs space-y-4 text-center">
          <Progress value={uploadProgress} className="h-2 w-full bg-stone-100 [&>div]:bg-amber-500" />
          <p className="text-sm font-medium text-stone-600 animate-pulse">
            {uploadProgress < 100 ? "Uploading photos..." : "Processing..."}
          </p>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div>
            <p className="text-lg font-serif font-medium text-stone-900">
              Drag & drop photos here
            </p>
            <p className="text-sm text-stone-500 mt-1">
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
            className="rounded-full bg-stone-900 px-8 hover:bg-stone-800"
          >
            Select Photos
          </Button>
          
          <p className="text-xs text-stone-400">
            Supports JPG, PNG, WEBP • Max 50 files
          </p>
        </div>
      )}
    </div>
  );
}
