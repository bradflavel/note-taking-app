"use client";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Undo2, Trash2, Folder, FileText } from "lucide-react";
import { getDeletedNotes, restoreNote, hardDeleteNote } from "@/lib/notes";
import { getDeletedFolders, restoreFolder, hardDeleteFolder } from "@/lib/folders";

type DeletedNote = { id: number; title: string; deletedAt: Date | null; folderId: number | null };
type DeletedFolder = { id: number; title: string; deletedAt: Date | null };

export default function TrashPage() {
  const [notes, setNotes] = useState<DeletedNote[]>([]);
  const [folders, setFolders] = useState<DeletedFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [n, f] = await Promise.all([getDeletedNotes(), getDeletedFolders()]);
    setNotes(n);
    setFolders(f);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const handleRestoreNote = async (id: number) => {
    await restoreNote(id);
    await refresh();
  };

  const handleHardDeleteNote = async (id: number) => {
    if (!window.confirm("Permanently delete this note? This can't be undone.")) return;
    await hardDeleteNote(id);
    await refresh();
  };

  const handleRestoreFolder = async (id: number) => {
    await restoreFolder(id);
    await refresh();
  };

  const handleHardDeleteFolder = async (id: number) => {
    if (!window.confirm("Permanently delete this folder and everything inside it? This can't be undone.")) return;
    await hardDeleteFolder(id);
    await refresh();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const isEmpty = notes.length === 0 && folders.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <a
            href="/"
            className="text-muted-light hover:text-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </a>
          <h1 className="text-xl font-semibold">Trash</h1>
        </div>

        {isEmpty ? (
          <p className="text-muted text-sm">Trash is empty.</p>
        ) : (
          <>
            {folders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xs font-medium text-muted-light uppercase tracking-wide mb-3">Folders</h2>
                <div className="space-y-1">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded hover:bg-surface-hover group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder size={14} className="text-muted-light shrink-0" />
                        <span className="text-sm truncate">{folder.title}</span>
                        <span className="text-xs text-muted-light shrink-0">
                          {formatDate(folder.deletedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRestoreFolder(folder.id)}
                          className="p-1.5 rounded text-muted-light hover:text-accent hover:bg-surface-active cursor-pointer"
                          title="Restore"
                        >
                          <Undo2 size={14} />
                        </button>
                        <button
                          onClick={() => handleHardDeleteFolder(folder.id)}
                          className="p-1.5 rounded text-muted-light hover:text-danger hover:bg-surface-active cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {notes.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-muted-light uppercase tracking-wide mb-3">Notes</h2>
                <div className="space-y-1">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded hover:bg-surface-hover group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className="text-muted-light shrink-0" />
                        <span className="text-sm truncate">{note.title}</span>
                        <span className="text-xs text-muted-light shrink-0">
                          {formatDate(note.deletedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRestoreNote(note.id)}
                          className="p-1.5 rounded text-muted-light hover:text-accent hover:bg-surface-active cursor-pointer"
                          title="Restore"
                        >
                          <Undo2 size={14} />
                        </button>
                        <button
                          onClick={() => handleHardDeleteNote(note.id)}
                          className="p-1.5 rounded text-muted-light hover:text-danger hover:bg-surface-active cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
