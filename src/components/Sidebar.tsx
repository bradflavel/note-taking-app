"use client";
import { useState, type RefObject } from "react";
import {
  Search, Plus, FolderPlus, FolderInput, FilePlus,
  ChevronRight, ChevronDown, X, Moon, Sun,
} from "lucide-react";
import type { Folder } from "@/lib/db";

type NoteItem = {
  id: number;
  title: string;
  updatedAt: Date;
  folderId: number | null;
};

interface SidebarProps {
  notes: NoteItem[];
  noteId: number | null;
  selectNote: (id: number) => void;
  createNote: (folderId?: number | null) => void;
  deleteNote: (id: number) => void;
  folders: Folder[];
  addFolder: (title: string, parentId: number | null) => void;
  editFolderName: (id: number, title: string) => void;
  removeFolder: (id: number) => void;
  moveNote: (noteId: number, folderId: number | null) => void;
  searchQuery: string;
  searchResults: NoteItem[];
  setSearch: (query: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export default function Sidebar({
  notes, noteId, selectNote, createNote, deleteNote,
  folders, addFolder, editFolderName, removeFolder, moveNote,
  searchQuery, searchResults, setSearch, searchInputRef,
}: SidebarProps) {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<number | null | false>(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [movingNoteId, setMovingNoteId] = useState<number | null>(null);

  const toggleCollapse = (id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submitNewFolder = () => {
    if (newFolderName.trim() && creatingFolderParentId !== false) {
      addFolder(newFolderName.trim(), creatingFolderParentId);
    }
    setCreatingFolderParentId(false);
    setNewFolderName("");
  };

  const rootNotes = notes.filter((n) => n.folderId === null);
  const notesByFolder = new Map<number, NoteItem[]>();
  for (const note of notes) {
    if (note.folderId !== null) {
      const arr = notesByFolder.get(note.folderId) ?? [];
      arr.push(note);
      notesByFolder.set(note.folderId, arr);
    }
  }

  const childFolders = (parentId: number | null) =>
    folders.filter((f) => f.parentFolder === parentId);

  const renderNoteRow = (note: NoteItem, depth: number) => (
    <div key={note.id} className="relative">
      <div className="group">
        <div
          className={`flex items-center justify-between py-2 text-sm rounded
            ${note.id === noteId
              ? "bg-surface-active font-medium"
              : "hover:bg-surface-hover"
            }`}
          style={{ paddingLeft: `${depth * 16 + 16}px`, paddingRight: "12px" }}
        >
          <button
            onClick={() => selectNote(note.id)}
            className="truncate text-left flex-1 cursor-pointer"
          >
            {note.title}
          </button>
          <button
            onClick={() => setMovingNoteId(movingNoteId === note.id ? null : note.id)}
            className="hidden group-hover:inline ml-2 text-muted-light hover:text-muted shrink-0 cursor-pointer"
            title="Move to folder"
          >
            <FolderInput size={14} />
          </button>
          <button
            onClick={() => deleteNote(note.id)}
            className="hidden group-hover:inline ml-1 text-muted-light hover:text-danger shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {movingNoteId === note.id && (
        <div
          data-move-menu
          className="ml-4 mr-2 my-1 rounded border border-border
                     bg-background shadow-sm text-sm overflow-hidden"
        >
          <button
            onClick={() => {
              moveNote(note.id, null);
              setMovingNoteId(null);
            }}
            className={`w-full text-left px-3 py-1.5 hover:bg-surface-hover
              ${note.folderId === null ? "text-muted-light cursor-default" : "cursor-pointer"}`}
            disabled={note.folderId === null}
          >
            No folder
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => {
                moveNote(note.id, folder.id);
                setMovingNoteId(null);
              }}
              className={`w-full text-left px-3 py-1.5 hover:bg-surface-hover
                ${note.folderId === folder.id ? "text-muted-light cursor-default" : "cursor-pointer"}`}
              disabled={note.folderId === folder.id}
            >
              {folder.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderFolder = (folder: Folder, depth: number) => (
    <div key={folder.id} className="mb-0.5">
      <div
        className="group flex items-center py-2 text-sm font-medium rounded hover:bg-surface-hover"
        style={{ paddingLeft: `${depth * 16 + 16}px`, paddingRight: "12px" }}
      >
        <button
          onClick={() => toggleCollapse(folder.id)}
          className="mr-1 text-muted-light cursor-pointer"
        >
          {collapsed.has(folder.id)
            ? <ChevronRight size={14} />
            : <ChevronDown size={14} />}
        </button>

        {renamingFolderId === folder.id ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => {
              if (renameValue.trim()) editFolderName(folder.id, renameValue.trim());
              setRenamingFolderId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenamingFolderId(null);
            }}
            className="flex-1 text-sm bg-transparent border-b border-border outline-none"
          />
        ) : (
          <span
            className="flex-1 truncate cursor-default"
            onDoubleClick={() => {
              setRenamingFolderId(folder.id);
              setRenameValue(folder.title);
            }}
          >
            {folder.title}
          </span>
        )}

        <button
          onClick={() => {
            setCreatingFolderParentId(folder.id);
            setNewFolderName("");
            setCollapsed((prev) => {
              const next = new Set(prev);
              next.delete(folder.id);
              return next;
            });
          }}
          className="hidden group-hover:inline ml-2 text-muted-light hover:text-muted shrink-0 cursor-pointer"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => createNote(folder.id)}
          className="hidden group-hover:inline ml-1 text-muted-light hover:text-muted shrink-0 cursor-pointer"
          title="New note in this folder"
        >
          <FilePlus size={14} />
        </button>
        <button
          onClick={() => removeFolder(folder.id)}
          className="hidden group-hover:inline ml-1 text-muted-light hover:text-danger shrink-0 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {!collapsed.has(folder.id) && (
        <>
          {childFolders(folder.id).map((child) => renderFolder(child, depth + 1))}

          {(notesByFolder.get(folder.id) ?? []).map((note) =>
            renderNoteRow(note, depth + 1)
          )}

          {creatingFolderParentId === folder.id && (
            <div
              className="flex items-center py-2"
              style={{ paddingLeft: `${(depth + 1) * 16 + 16}px`, paddingRight: "12px" }}
            >
              <ChevronDown size={14} className="mr-1 text-muted-light" />
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={submitNewFolder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    setCreatingFolderParentId(false);
                    setNewFolderName("");
                  }
                }}
                placeholder="Folder name..."
                className="flex-1 text-sm bg-transparent border-b border-border outline-none"
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div
      className="w-64 border-r border-border bg-sidebar-bg overflow-y-auto p-4 flex flex-col"
      onMouseDown={(e) => {
        if (movingNoteId !== null && !(e.target as HTMLElement).closest("[data-move-menu]")) {
          setMovingNoteId(null);
        }
      }}
    >
      {/* search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
        <input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearch("");
          }}
          placeholder="Search notes..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded border border-border
                     bg-search-bg outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      {searchQuery.trim() ? (
        searchResults.length > 0 ? (
          searchResults.map((note) => renderNoteRow(note, 0))
        ) : (
          <p className="text-sm text-muted-light px-3 py-2">No results</p>
        )
      ) : (
        <>
          <div className="flex gap-2 mb-5 mt-1">
            <button
              onClick={() => createNote()}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded cursor-pointer
                         bg-surface-hover hover:bg-surface-active"
            >
              <Plus size={14} /> Note
            </button>
            <button
              onClick={() => {
                setCreatingFolderParentId(null);
                setNewFolderName("");
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded cursor-pointer
                         bg-surface-hover hover:bg-surface-active"
            >
              <FolderPlus size={14} /> Folder
            </button>
          </div>

          {creatingFolderParentId === null && (
            <div className="flex items-center px-4 py-2 mb-1">
              <ChevronDown size={14} className="mr-1 text-muted-light" />
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={submitNewFolder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    setCreatingFolderParentId(false);
                    setNewFolderName("");
                  }
                }}
                placeholder="Folder name..."
                className="flex-1 text-sm bg-transparent border-b border-border outline-none"
              />
            </div>
          )}

          {childFolders(null).map((folder) => renderFolder(folder, 0))}

          {rootNotes.length > 0 && childFolders(null).length > 0 && (
            <div className="border-t border-border my-2" />
          )}
          {rootNotes.map((note) => renderNoteRow(note, 0))}
        </>
      )}
      </div>

      <button
        onClick={toggleTheme}
        className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-light hover:text-muted cursor-pointer"
      >
        {dark ? <Sun size={14} /> : <Moon size={14} />}
        {dark ? "Light mode" : "Dark mode"}
      </button>
    </div>
  );
}
