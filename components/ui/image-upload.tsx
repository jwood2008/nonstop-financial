"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fileToDataUrl, MAX_UPLOAD_BYTES } from "@/lib/file";

/**
 * Drag-and-drop image uploader (adapted from the use-image-upload registry
 * component). Unlike the demo's object-URL preview, this stores a DATA URL via
 * onChange so admin uploads persist in localStorage with no backend.
 */
export function ImageUpload({
  value,
  onChange,
  accept = "image/*",
}: {
  value?: string;
  onChange: (dataUrl: string) => void;
  accept?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      setErr(null);
      if (!file.type.startsWith("image/")) {
        setErr("Please choose an image file.");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setErr("File too large (~4.5MB max). Paste a hosted URL instead.");
        return;
      }
      onChange(await fileToDataUrl(file));
    },
    [onChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!value ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={onDrop}
          className={cn(
            "flex h-48 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-line-2 bg-surface-2/50 transition-colors hover:bg-surface-2",
            isDragging && "border-nonstop/60 bg-nonstop/5"
          )}
        >
          <div className="flex h-11 w-11 items-center justify-center bg-surface-3">
            <ImagePlus className="h-5 w-5 text-zinc-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Click to upload</p>
            <p className="text-xs text-muted-2">or drag &amp; drop an image here</p>
          </div>
        </div>
      ) : (
        <div className="group relative h-48 overflow-hidden border border-line bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="h-full w-full object-contain" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 p-0"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onChange("")}
              className="h-9 w-9 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
    </div>
  );
}
