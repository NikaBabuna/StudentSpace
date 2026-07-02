/* =============================================================================
 * features/materials/components/MaterialsClient.tsx — class materials library
 * -----------------------------------------------------------------------------
 * Role: Accordion of material groups; tutor uploads to Storage, renames,
 *       pins, deletes files/groups via materials actions.
 * Dependencies: materials actions, lib/supabase/client (upload), components/ui
 * Used by: app/classes/[id]/materials/page.tsx
 * Inputs: role, groups with signed file URLs from server
 * Outputs: Interactive materials browser and upload UI
 * ========================================================================== */
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { FileDropZone, formatFileSize } from "@/components/ui/file-drop-zone";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import {
  createMaterialGroup,
  insertMaterials,
  renameMaterialGroup,
  deleteMaterial,
  deleteMaterialGroup,
  toggleMaterialPin,
  type MaterialItem,
} from "@/features/materials/actions";

interface Group {
  id: string;
  name: string;
  created_at: string;
}

interface Material {
  id: string;
  group_id: string;
  title: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  is_pinned: boolean;
  created_at: string;
}

function isNew(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) < 7;
}

function cleanName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/^\d+-\d+-/, "");
}

function displayTitle(title: string) {
  return title.replace(/^[a-f0-9]{8,}_/i, "").replace(/_/g, " ");
}

function fileType(mime: string | null) {
  if (!mime) return "File";
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("image")) return "Image";
  if (mime.includes("word") || mime.includes("document")) return "Doc";
  return "File";
}

function typeBadgeTone(mime: string | null): "danger" | "accent" | "neutral" {
  const type = fileType(mime);
  if (type === "PDF") return "danger";
  if (type === "Image") return "accent";
  return "neutral";
}

function TypeBadge({ mime }: { mime: string | null }) {
  return (
    <Badge tone={typeBadgeTone(mime)} className="text-[9px] font-semibold uppercase">
      {fileType(mime)}
    </Badge>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
  widthClass = "max-w-[460px]",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-[var(--shadow)]",
          widthClass
        )}
        role="dialog"
        aria-labelledby="materials-modal-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="materials-modal-title" className="text-[17px] font-semibold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <IconButton size="sm" aria-label="Close" onClick={onClose}>
            ✕
          </IconButton>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function MaterialsClient({
  classId,
  role,
  groups,
  materials,
}: {
  classId: string;
  role: string;
  groups: Group[];
  materials: Material[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const isTutor = role === "tutor";

  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [pinnedFiles, setPinnedFiles] = useState<string[]>(
    materials.filter((m) => m.is_pinned).map((m) => m.id)
  );

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [managingGroup, setManagingGroup] = useState<Group | null>(null);
  const [addFiles, setAddFiles] = useState<File[]>([]);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addProgress, setAddProgress] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleGroup(id: string) {
    setOpenGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function togglePin(materialId: string) {
    const pinned = pinnedFiles.includes(materialId);
    setPinnedFiles((prev) =>
      pinned ? prev.filter((f) => f !== materialId) : [...prev, materialId]
    );
    await toggleMaterialPin(classId, materialId, !pinned);
  }

  async function handleDeleteFile(materialId: string) {
    const { error } = await deleteMaterial(classId, materialId);
    if (error) {
      setManageError(error);
      return;
    }
    router.refresh();
  }

  async function handleNewGroupUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim() || uploadFiles.length === 0) return;
    setUploadLoading(true);
    setUploadError(null);

    const { groupId, error: groupError } = await createMaterialGroup(
      classId,
      newGroupName.trim()
    );
    if (groupError || !groupId) {
      setUploadError(groupError ?? "Could not create group.");
      setUploadLoading(false);
      return;
    }

    const items: MaterialItem[] = [];
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      setUploadProgress(`Uploading ${i + 1} of ${uploadFiles.length}…`);
      const ext = file.name.split(".").pop();
      const path = `${classId}/${Date.now()}-${i}.${ext}`;
      const { error: storageError } = await supabase.storage.from("materials").upload(path, file);
      if (storageError) {
        setUploadError(storageError.message);
        setUploadLoading(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("materials").getPublicUrl(path);
      items.push({
        groupId,
        title: cleanName(file.name),
        fileUrl: publicUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
      });
    }

    const { error: insertError } = await insertMaterials(classId, items);
    if (insertError) {
      setUploadError(insertError);
      setUploadLoading(false);
      return;
    }

    setUploadLoading(false);
    setUploadProgress(null);
    setShowUploadModal(false);
    setNewGroupName("");
    setUploadFiles([]);
    setOpenGroups((prev) => [...prev, groupId]);
    router.refresh();
  }

  async function handleAddFiles(e: React.FormEvent) {
    e.preventDefault();
    if (!managingGroup || addFiles.length === 0) return;
    setAddLoading(true);
    setManageError(null);

    const items: MaterialItem[] = [];
    for (let i = 0; i < addFiles.length; i++) {
      const file = addFiles[i];
      setAddProgress(`Uploading ${i + 1} of ${addFiles.length}…`);
      const ext = file.name.split(".").pop();
      const path = `${classId}/${Date.now()}-${i}.${ext}`;
      const { error: storageError } = await supabase.storage.from("materials").upload(path, file);
      if (storageError) {
        setManageError(storageError.message);
        setAddLoading(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("materials").getPublicUrl(path);
      items.push({
        groupId: managingGroup.id,
        title: cleanName(file.name),
        fileUrl: publicUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
      });
    }

    const { error: insertError } = await insertMaterials(classId, items);
    if (insertError) {
      setManageError(insertError);
      setAddLoading(false);
      return;
    }

    setAddLoading(false);
    setAddProgress(null);
    setAddFiles([]);
    router.refresh();
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!managingGroup || !renameName.trim()) return;
    const { error } = await renameMaterialGroup(classId, managingGroup.id, renameName.trim());
    if (error) {
      setManageError(error);
      return;
    }
    setRenaming(false);
    router.refresh();
  }

  async function handleDeleteGroup() {
    if (!managingGroup) return;
    const { error } = await deleteMaterialGroup(classId, managingGroup.id);
    if (error) {
      setManageError(error);
      return;
    }
    setManagingGroup(null);
    setConfirmDelete(false);
    router.refresh();
  }

  function openManage(group: Group) {
    setManagingGroup(group);
    setRenameName(group.name);
    setRenaming(false);
    setAddFiles([]);
    setManageError(null);
    setConfirmDelete(false);
  }

  function openUploadModal() {
    setNewGroupName("");
    setUploadFiles([]);
    setUploadError(null);
    setShowUploadModal(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {groups.length} {groups.length === 1 ? "group" : "groups"} · {materials.length}{" "}
          {materials.length === 1 ? "file" : "files"}
        </p>
        {isTutor ? (
          <Button size="sm" onClick={openUploadModal}>
            + Upload
          </Button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No materials yet"
          description={
            isTutor
              ? "Upload your first group of reference files for this class."
              : "Your tutor hasn't uploaded any materials yet."
          }
          action={
            isTutor ? (
              <Button size="sm" onClick={openUploadModal}>
                Upload files
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const groupFiles = materials.filter((m) => m.group_id === group.id);
            const newCount = groupFiles.filter((m) => isNew(m.created_at)).length;
            const isOpen = openGroups.includes(group.id);

            return (
              <Card key={group.id} className="p-0">
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-3",
                    isOpen && "border-b border-line"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left transition-colors hover:bg-surface-2/60"
                  >
                    <span className="shrink-0 text-lg">📁</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
                      {group.name}
                    </span>
                    {newCount > 0 ? (
                      <Badge tone="ok" className="shrink-0 text-[9px] font-semibold uppercase">
                        {newCount} new
                      </Badge>
                    ) : null}
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {groupFiles.length} {groupFiles.length === 1 ? "file" : "files"}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[13px] text-muted transition-transform",
                        isOpen && "rotate-90"
                      )}
                      aria-hidden
                    >
                      ›
                    </span>
                  </button>
                  {isTutor ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 shrink-0 px-2.5 text-[11px]"
                      onClick={() => openManage(group)}
                    >
                      Edit
                    </Button>
                  ) : null}
                </div>

                {isOpen ? (
                  <CardContent className="px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
                    {groupFiles.length === 0 ? (
                      <p className="py-4 text-center text-[12px] text-muted">
                        {isTutor
                          ? "No files yet. Click Edit to add files."
                          : "No files in this group yet."}
                      </p>
                    ) : (
                      <div className="flex flex-col">
                        {groupFiles.map((file) => {
                          const pinned = pinnedFiles.includes(file.id);
                          const fileIsNew = isNew(file.created_at);
                          return (
                            <div
                              key={file.id}
                              className="flex items-center gap-3 border-t border-line py-3 first:border-t-0"
                            >
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-w-0 flex-1 items-center gap-3 no-underline"
                              >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-lg">
                                  {file.mime_type?.includes("image") ? "🖼" : "📄"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-[13px] font-medium text-ink">
                                      {displayTitle(file.title)}
                                    </span>
                                    {fileIsNew ? (
                                      <Badge
                                        tone="ok"
                                        className="shrink-0 text-[8px] font-semibold uppercase"
                                      >
                                        New
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="mt-0.5 truncate font-mono text-[10px] text-muted">
                                    {new Date(file.created_at).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                    {file.file_size_bytes
                                      ? ` · ${formatFileSize(file.file_size_bytes)}`
                                      : ""}
                                  </div>
                                </div>
                              </a>
                              <TypeBadge mime={file.mime_type} />
                              {isTutor ? (
                                <IconButton
                                  size="sm"
                                  aria-label={pinned ? "Unpin file" : "Pin file"}
                                  className={cn(
                                    "size-8 shrink-0 text-muted hover:text-accent",
                                    pinned && "text-accent"
                                  )}
                                  onClick={() => togglePin(file.id)}
                                >
                                  ★
                                </IconButton>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {showUploadModal ? (
        <ModalShell
          title="Upload files"
          description="Creates a new group with the files inside."
          onClose={() => setShowUploadModal(false)}
          widthClass="max-w-[440px]"
        >
          <form onSubmit={handleNewGroupUpload} className="flex flex-col gap-4">
            <Field label="Group name" htmlFor="material-group-name">
              <Input
                id="material-group-name"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Vectors"
                required
              />
            </Field>

            <Field label="Files" hint="One or more files">
              <FileDropZone files={uploadFiles} onChange={setUploadFiles} />
            </Field>

            {uploadProgress ? (
              <p className="rounded-xl border border-ok/30 bg-ok-tint px-3 py-2 text-[12px] text-ok">
                {uploadProgress}
              </p>
            ) : null}

            {uploadError ? (
              <p className="rounded-xl border border-danger/30 bg-danger-tint px-3 py-2 text-[12px] text-danger">
                {uploadError}
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                busy={uploadLoading}
                disabled={uploadFiles.length === 0}
              >
                {uploadLoading
                  ? (uploadProgress ?? "Uploading…")
                  : `Upload${uploadFiles.length > 1 ? ` ${uploadFiles.length} files` : ""}`}
              </Button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {managingGroup ? (
        <ModalShell
          title={managingGroup.name}
          onClose={() => setManagingGroup(null)}
        >
          <div className="mb-4 flex items-center gap-2">
            {renaming ? (
              <form onSubmit={handleRename} className="flex flex-1 items-center gap-2">
                <Input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  autoFocus
                  className="flex-1"
                />
                <Button type="submit" size="sm">
                  Save
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setRenaming(false)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={() => setRenaming(true)}>
                  Rename
                </Button>
              </>
            )}
          </div>

          <div className="mb-5">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
              Add files
            </div>
            <form onSubmit={handleAddFiles} className="flex flex-col gap-2">
              <FileDropZone files={addFiles} onChange={setAddFiles} />
              {addFiles.length > 0 ? (
                <Button type="submit" size="sm" busy={addLoading}>
                  {addLoading
                    ? (addProgress ?? "Uploading…")
                    : `Upload ${addFiles.length} file${addFiles.length > 1 ? "s" : ""}`}
                </Button>
              ) : null}
            </form>
          </div>

          <div className="mb-5">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
              Files
            </div>
            <div className="overflow-hidden rounded-xl border border-line">
              {materials.filter((m) => m.group_id === managingGroup.id).length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-muted">No files yet.</p>
              ) : (
                materials
                  .filter((m) => m.group_id === managingGroup.id)
                  .map((file, i, arr) => (
                    <div
                      key={file.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2",
                        i < arr.length - 1 && "border-b border-line"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] text-ink">{displayTitle(file.title)}</div>
                        <div className="text-[10px] text-muted">
                          {formatFileSize(file.file_size_bytes)}
                        </div>
                      </div>
                      <TypeBadge mime={file.mime_type} />
                      <IconButton
                        size="sm"
                        aria-label={`Remove ${file.title}`}
                        className="size-7 text-muted hover:text-danger"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        ×
                      </IconButton>
                    </div>
                  ))
              )}
            </div>
          </div>

          {manageError ? (
            <p className="mb-3 rounded-xl border border-danger/30 bg-danger-tint px-3 py-2 text-[12px] text-danger">
              {manageError}
            </p>
          ) : null}

          <div className="border-t border-line pt-4">
            {!confirmDelete ? (
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                Delete group
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-muted">
                  Delete group and all its files?
                </span>
                <Button variant="destructive" size="sm" onClick={handleDeleteGroup}>
                  Yes, delete
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
