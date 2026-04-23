"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

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

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isNew(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) < 7;
}

function cleanName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/^\d+-\d+-/, "");
}

function fileType(mime: string | null) {
  if (!mime) return "File";
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("image")) return "Image";
  if (mime.includes("word") || mime.includes("document")) return "Doc";
  return "File";
}

function TypeBadge({ mime }: { mime: string | null }) {
  const type = fileType(mime);
  const isPdf = type === "PDF";
  const isImg = type === "Image";
  return (
    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
      style={{
        background: isPdf ? "#2a1510" : isImg ? "#101828" : "#1a1818",
        color: isPdf ? "#c86040" : isImg ? "#4080c8" : "#7a7060",
        border: `0.5px solid ${isPdf ? "#4a2510" : isImg ? "#102040" : "#3a3020"}`,
      }}>
      {type}
    </span>
  );
}

export default function MaterialsClient({ classId, userId, role, groups, materials }: {
  classId: string;
  userId: string;
  role: string;
  groups: Group[];
  materials: Material[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const isTutor = role === "tutor";

  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [pinnedFiles, setPinnedFiles] = useState<string[]>(
    materials.filter(m => m.is_pinned).map(m => m.id)
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
    setOpenGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  }

  async function togglePin(materialId: string) {
    const pinned = pinnedFiles.includes(materialId);
    setPinnedFiles(prev =>
      pinned ? prev.filter(f => f !== materialId) : [...prev, materialId]
    );
    await supabase.from("materials").update({ is_pinned: !pinned }).eq("id", materialId);
  }

  async function handleDeleteFile(materialId: string) {
    await supabase.from("materials")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", materialId);
    router.refresh();
  }

  async function handleNewGroupUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim() || uploadFiles.length === 0) return;
    setUploadLoading(true);
    setUploadError(null);

    const { data: group, error: groupError } = await supabase
      .from("material_groups")
      .insert({ class_id: classId, created_by: userId, name: newGroupName.trim() })
      .select().single();

    if (groupError) { setUploadError(groupError.message); setUploadLoading(false); return; }

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      setUploadProgress(`Uploading ${i + 1} of ${uploadFiles.length}…`);
      const ext = file.name.split(".").pop();
      const path = `${classId}/${Date.now()}-${i}.${ext}`;
      const { error: storageError } = await supabase.storage.from("materials").upload(path, file);
      if (storageError) { setUploadError(storageError.message); setUploadLoading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(path);
      await supabase.from("materials").insert({
        group_id: group.id, class_id: classId, uploaded_by: userId,
        title: cleanName(file.name),
        file_url: publicUrl, file_name: file.name,
        file_size_bytes: file.size, mime_type: file.type, is_pinned: false,
      });
    }

    setUploadLoading(false);
    setUploadProgress(null);
    setShowUploadModal(false);
    setNewGroupName(""); setUploadFiles([]);
    setOpenGroups(prev => [...prev, group.id]);
    router.refresh();
  }

  async function handleAddFiles(e: React.FormEvent) {
    e.preventDefault();
    if (!managingGroup || addFiles.length === 0) return;
    setAddLoading(true);
    setManageError(null);

    for (let i = 0; i < addFiles.length; i++) {
      const file = addFiles[i];
      setAddProgress(`Uploading ${i + 1} of ${addFiles.length}…`);
      const ext = file.name.split(".").pop();
      const path = `${classId}/${Date.now()}-${i}.${ext}`;
      const { error: storageError } = await supabase.storage.from("materials").upload(path, file);
      if (storageError) { setManageError(storageError.message); setAddLoading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(path);
      await supabase.from("materials").insert({
        group_id: managingGroup.id, class_id: classId, uploaded_by: userId,
        title: cleanName(file.name),
        file_url: publicUrl, file_name: file.name,
        file_size_bytes: file.size, mime_type: file.type, is_pinned: false,
      });
    }

    setAddLoading(false);
    setAddProgress(null);
    setAddFiles([]);
    router.refresh();
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!managingGroup || !renameName.trim()) return;
    await supabase.from("material_groups")
      .update({ name: renameName.trim() })
      .eq("id", managingGroup.id);
    setRenaming(false);
    router.refresh();
  }

  async function handleDeleteGroup() {
    if (!managingGroup) return;
    await supabase.from("materials")
      .update({ deleted_at: new Date().toISOString() })
      .eq("group_id", managingGroup.id);
    await supabase.from("material_groups")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", managingGroup.id);
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

  return (
    <div className="p-6">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="text-[12px]" style={{ color: "var(--color-ss-text-faint)" }}>
          {groups.length} {groups.length === 1 ? "group" : "groups"} · {materials.length} {materials.length === 1 ? "file" : "files"}
        </div>
        {isTutor && (
          <button onClick={() => { setNewGroupName(""); setUploadFiles([]); setUploadError(null); setShowUploadModal(true); }}
            className="text-[12px] font-medium px-3 py-1.5 rounded"
            style={{ color: "var(--color-ss-amber-light)", background: "var(--color-ss-amber-dim)", border: "0.5px solid var(--color-ss-amber-border)" }}>
            + Upload
          </button>
        )}
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="text-center py-12 text-[13px]" style={{ color: "var(--color-ss-text-ghost)" }}>
          {isTutor ? "Click + Upload to create your first group." : "No materials uploaded yet."}
        </div>
      )}

      {/* Groups — full width stacked */}
      <div className="flex flex-col gap-3">
        {groups.map(group => {
          const groupFiles = materials.filter(m => m.group_id === group.id);
          const newCount = groupFiles.filter(m => isNew(m.created_at)).length;
          const isOpen = openGroups.includes(group.id);

          return (
            <div key={group.id} className="rounded-xl overflow-hidden"
              style={{ background: "#201e18", border: `0.5px solid ${isOpen ? "#6a5530" : "#3a3630"}` }}>

              {/* Group header */}
              <div
                onClick={() => toggleGroup(group.id)}
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                style={{ borderBottom: isOpen ? "0.5px solid #2a2820" : "none" }}
              >
                <div className="text-[18px] shrink-0">📁</div>
                <div className="text-[14px] font-medium flex-1" style={{ color: "#d8c8a0" }}>
                  {group.name}
                </div>
                {newCount > 0 && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: "#1a2a10", color: "#70b040", border: "0.5px solid #2a4a10" }}>
                    {newCount} new
                  </span>
                )}
                <div className="text-[11px]" style={{ color: "#5a5248" }}>
                  {groupFiles.length} {groupFiles.length === 1 ? "file" : "files"}
                </div>
                {isTutor && (
                  <div
                    onClick={ev => { ev.stopPropagation(); openManage(group); }}
                    className="text-[10px] px-2 py-0.5 rounded cursor-pointer"
                    style={{ background: "#2a2820", color: "#7a7060", border: "0.5px solid #3a3630" }}>
                    Manage
                  </div>
                )}
                <span className="text-[13px]" style={{
                  color: "#5a5248",
                  display: "inline-block",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}>›</span>
              </div>

              {/* Files grid */}
              {isOpen && (
                <div className="p-4">
                  {groupFiles.length === 0 ? (
                    <div className="text-[12px] text-center py-4" style={{ color: "var(--color-ss-text-ghost)" }}>
                      No files yet. Click Manage to add files.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {groupFiles.map(file => {
                        const pinned = pinnedFiles.includes(file.id);
                        const fileIsNew = isNew(file.created_at);
                        return (
                          <a key={file.id} href={file.file_url} target="_blank" rel="noreferrer"
                            className="rounded-lg p-3 flex flex-col gap-2 relative"
                            style={{ background: "#17150f", border: "0.5px solid #2a2820", textDecoration: "none" }}>

                            {fileIsNew && (
                              <span className="absolute top-2 left-2 text-[8px] font-medium px-1.5 py-0.5 rounded"
                                style={{ background: "#1a2a10", color: "#70b040", border: "0.5px solid #2a4a10" }}>
                                New
                              </span>
                            )}

                            {isTutor && (
                              <button
                                onClick={ev => { ev.preventDefault(); ev.stopPropagation(); togglePin(file.id); }}
                                className="absolute top-2 right-2 text-[12px]"
                                style={{ color: pinned ? "var(--color-ss-amber)" : "#3a3630" }}
                                title={pinned ? "Unpin" : "Pin"}>
                                ★
                              </button>
                            )}

                            <div className="flex items-center justify-between mt-4">
                              <span className="text-[20px]">
                                {file.mime_type?.includes("image") ? "🖼" : "📄"}
                              </span>
                              <TypeBadge mime={file.mime_type} />
                            </div>

                            <div className="text-[12px] font-medium leading-snug" style={{ color: "#c8b890" }}>
                              {file.title}
                            </div>
                            <div className="text-[10px]" style={{ color: "#4a4438" }}>
                              {new Date(file.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              {file.file_size_bytes ? ` · ${formatSize(file.file_size_bytes)}` : ""}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[440px] rounded-xl p-6"
            style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[16px] font-medium mb-1" style={{ color: "var(--color-ss-text-primary)" }}>
              Upload files
            </div>
            <div className="text-[12px] mb-4" style={{ color: "var(--color-ss-text-faint)" }}>
              Creates a new group with the files inside.
            </div>
            <form onSubmit={handleNewGroupUpload} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>Group name</label>
                <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required
                  placeholder="e.g. Vectors"
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: "var(--color-ss-text-faint)" }}>
                  Files <span style={{ color: "var(--color-ss-text-ghost)" }}>(one or more)</span>
                </label>
                <input type="file" multiple required
                  onChange={e => setUploadFiles(Array.from(e.target.files ?? []))}
                  className="w-full text-[12px]"
                  style={{ color: "var(--color-ss-text-faint)" }} />
                {uploadFiles.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {uploadFiles.map((f, i) => (
                      <div key={i} className="text-[11px] flex items-center gap-2" style={{ color: "var(--color-ss-text-faint)" }}>
                        <span>📄</span>
                        <span className="flex-1 truncate">{cleanName(f.name)}</span>
                        <span style={{ color: "var(--color-ss-text-ghost)" }}>{formatSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {uploadProgress && (
                <div className="text-[12px] px-3 py-2 rounded-md"
                  style={{ background: "#1a2010", color: "#70b040", border: "0.5px solid #2a4010" }}>
                  {uploadProgress}
                </div>
              )}
              {uploadError && (
                <div className="text-[12px] px-3 py-2 rounded-md"
                  style={{ background: "var(--color-ss-red-bg)", color: "var(--color-ss-red)", border: "0.5px solid var(--color-ss-red-border)" }}>
                  {uploadError}
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2 rounded-md text-[13px]"
                  style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={uploadLoading}
                  className="flex-1 py-2 rounded-md text-[13px] font-medium"
                  style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: uploadLoading ? 0.6 : 1 }}>
                  {uploadLoading ? (uploadProgress ?? "Uploading…") : `Upload${uploadFiles.length > 1 ? ` ${uploadFiles.length} files` : ""}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage group modal */}
      {managingGroup && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[460px] rounded-xl p-6"
            style={{ background: "#201e18", border: "0.5px solid var(--color-ss-border)" }}>

            <div className="flex items-center justify-between mb-4">
              {renaming ? (
                <form onSubmit={handleRename} className="flex items-center gap-2 flex-1 mr-2">
                  <input type="text" value={renameName} onChange={e => setRenameName(e.target.value)}
                    autoFocus className="flex-1 px-2 py-1 rounded text-[14px] font-medium outline-none"
                    style={{ background: "#17150f", border: "0.5px solid var(--color-ss-amber-border)", color: "#d8c8a0" }} />
                  <button type="submit" className="text-[11px] px-2 py-1 rounded"
                    style={{ background: "#2a2010", color: "var(--color-ss-amber-light)", border: "0.5px solid var(--color-ss-amber-border)" }}>
                    Save
                  </button>
                  <button type="button" onClick={() => setRenaming(false)} className="text-[11px] px-2 py-1 rounded"
                    style={{ background: "#2a2820", color: "var(--color-ss-text-muted)", border: "0.5px solid var(--color-ss-border)" }}>
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <div className="text-[16px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
                    {managingGroup.name}
                  </div>
                  <button onClick={() => setRenaming(true)}
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: "#2a2820", color: "#7a7060", border: "0.5px solid #3a3630" }}>
                    Rename
                  </button>
                </div>
              )}
              <button onClick={() => setManagingGroup(null)}
                className="text-[13px]" style={{ color: "#5a5248" }}>✕</button>
            </div>

            {/* Add files */}
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "#5a5248" }}>Add files</div>
              <form onSubmit={handleAddFiles} className="flex flex-col gap-2">
                <input type="file" multiple
                  onChange={e => setAddFiles(Array.from(e.target.files ?? []))}
                  className="w-full text-[12px]"
                  style={{ color: "var(--color-ss-text-faint)" }} />
                {addFiles.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {addFiles.map((f, i) => (
                      <div key={i} className="text-[11px] flex items-center gap-2" style={{ color: "var(--color-ss-text-faint)" }}>
                        <span>📄</span>
                        <span className="flex-1 truncate">{cleanName(f.name)}</span>
                        <span style={{ color: "var(--color-ss-text-ghost)" }}>{formatSize(f.size)}</span>
                      </div>
                    ))}
                    <button type="submit" disabled={addLoading}
                      className="w-full py-1.5 rounded-md text-[12px] font-medium mt-1"
                      style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: addLoading ? 0.6 : 1 }}>
                      {addLoading ? (addProgress ?? "Uploading…") : `Upload ${addFiles.length} file${addFiles.length > 1 ? "s" : ""}`}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Existing files */}
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "#5a5248" }}>Files</div>
              <div className="rounded-lg overflow-hidden" style={{ border: "0.5px solid var(--color-ss-border)" }}>
                {materials.filter(m => m.group_id === managingGroup.id).length === 0 ? (
                  <div className="px-3 py-2 text-[12px]" style={{ color: "var(--color-ss-text-ghost)" }}>No files yet.</div>
                ) : (
                  materials.filter(m => m.group_id === managingGroup.id).map((file, i, arr) => (
                    <div key={file.id} className="flex items-center gap-2 px-3 py-2"
                      style={{ borderBottom: i < arr.length - 1 ? "0.5px solid #252320" : "none" }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] truncate" style={{ color: "#c8b890" }}>{file.title}</div>
                        <div className="text-[10px]" style={{ color: "#4a4438" }}>{formatSize(file.file_size_bytes)}</div>
                      </div>
                      <TypeBadge mime={file.mime_type} />
                      <button onClick={() => handleDeleteFile(file.id)}
                        className="text-[11px] px-1.5 py-0.5 rounded ml-1"
                        style={{ color: "var(--color-ss-red)", background: "var(--color-ss-red-bg)", border: "0.5px solid var(--color-ss-red-border)" }}>
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {manageError && (
              <div className="text-[12px] px-3 py-2 rounded-md mb-3"
                style={{ background: "var(--color-ss-red-bg)", color: "var(--color-ss-red)", border: "0.5px solid var(--color-ss-red-border)" }}>
                {manageError}
              </div>
            )}

            {/* Delete group */}
            <div style={{ borderTop: "0.5px solid #2a2820", paddingTop: "12px" }}>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="text-[12px] px-3 py-1.5 rounded"
                  style={{ color: "var(--color-ss-red)", background: "var(--color-ss-red-bg)", border: "0.5px solid var(--color-ss-red-border)" }}>
                  Delete group
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px]" style={{ color: "var(--color-ss-text-faint)" }}>
                    Delete group and all its files?
                  </span>
                  <button onClick={handleDeleteGroup}
                    className="text-[12px] px-3 py-1 rounded font-medium"
                    style={{ background: "var(--color-ss-red)", color: "#fff", border: "none" }}>
                    Yes, delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="text-[12px] px-3 py-1 rounded"
                    style={{ color: "var(--color-ss-text-muted)", background: "#2a2820", border: "0.5px solid var(--color-ss-border)" }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}