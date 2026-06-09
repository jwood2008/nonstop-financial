"use client";

import { useRef, useState } from "react";
import { useStore, newFileId } from "@/lib/store";
import { fileToDataUrl, MAX_UPLOAD_BYTES } from "@/lib/file";
import type { Lesson } from "@/lib/types";
import { FileText, Upload, Trash2, Download, FileIcon } from "lucide-react";

export function FilesTab({ lesson, isAdmin }: { lesson: Lesson; isAdmin: boolean }) {
  const { addFile, removeFile } = useStore();
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  const onPick = async (file?: File) => {
    if (!file) return;
    setErr(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setErr("File too large for browser storage (~4.5MB max).");
      return;
    }
    const src = await fileToDataUrl(file);
    addFile(lesson.id, {
      id: newFileId(),
      name: file.name,
      kind: file.type || "file",
      src,
    });
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div>
          <input
            ref={ref}
            type="file"
            hidden
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <button
            onClick={() => ref.current?.click()}
            className="inline-flex items-center gap-1.5 bg-nonstop px-3 py-2 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
          >
            <Upload className="h-4 w-4" /> Add file (PDF, script, worksheet…)
          </button>
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
        </div>
      )}

      {lesson.files.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border border-dashed border-line-2 py-10 text-center">
          <FileText className="h-8 w-8 text-muted-2" />
          <p className="text-sm text-muted">No files attached yet.</p>
          {isAdmin && (
            <p className="text-xs text-muted-2">
              Upload PDFs, scripts, presentations or worksheets above.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-line border border-line">
          {lesson.files.map((f) => {
            // A file with no src is a placeholder slot from the curriculum —
            // the document exists in the outline but hasn't been uploaded yet.
            const pending = !f.src;
            return (
            <li key={f.id} className="flex items-center gap-3 p-3">
              <span className="flex h-9 w-9 items-center justify-center bg-surface-3">
                <FileIcon className="h-4 w-4 text-zinc-300" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{f.name}</p>
                <p className="text-xs text-muted-2">{f.kind || "file"}</p>
              </div>
              {pending ? (
                <span className="shrink-0 bg-surface-3 px-2 py-1 text-[11px] font-medium text-muted-2">
                  Coming soon
                </span>
              ) : (
                <a
                  href={f.src}
                  download={f.name}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-muted transition hover:bg-surface-2 hover:text-white"
                  title="Open / download"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
              {isAdmin && (
                <button
                  onClick={() => removeFile(lesson.id, f.id)}
                  className="p-2 text-muted-2 transition hover:bg-red-500/10 hover:text-red-400"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-2">Files stay available after the lesson is complete.</p>
    </div>
  );
}
