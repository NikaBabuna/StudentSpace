/* =============================================================================
 * components/ui/file-drop-zone.tsx — click/drag file picker with list
 * -----------------------------------------------------------------------------
 * Role: Shared upload control: click-or-drop target, dedupes picks by
 *       name+size, renders the pending list with remove buttons. Pure UI —
 *       the caller owns the File[] state and does the actual upload.
 * Dependencies: components/ui (IconButton), lib/utils
 * Used by: HomeworkClient (create + submit), MaterialsClient (upload + add)
 * Inputs: files (File[]), onChange
 * Outputs: Updated File[] via onChange
 * ========================================================================== */
"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/icon-button";

/** "512 B" / "34 KB" / "1.2 MB"; empty string when size is unknown. */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropZone({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = [...files];
    Array.from(incoming).forEach((f) => {
      if (!next.find((x) => x.name === f.name && x.size === f.size)) next.push(f);
    });
    onChange(next);
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 select-none transition-colors",
          dragging
            ? "border-accent bg-accent-tint text-accent"
            : "border-line-2 bg-surface-2 text-muted hover:bg-surface-3"
        )}
      >
        <span className="text-lg">📎</span>
        <span className="text-[12px] font-medium text-ink-2">Click to attach files</span>
        <span className="text-[11px] text-muted">or drag and drop</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {files.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5"
            >
              <span className="text-[13px]">📄</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{f.name}</span>
              <span className="shrink-0 text-[10px] text-muted">{formatFileSize(f.size)}</span>
              <IconButton
                size="sm"
                aria-label={`Remove ${f.name}`}
                className="size-6 text-muted hover:text-danger"
                onClick={() => removeFile(i)}
              >
                ×
              </IconButton>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
