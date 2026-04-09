"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNote } from "@/hooks/useNote";
import type { Folder } from "@/lib/db";

export default function Home() {
  const {
    markdown, setMarkdown, isLoading,
    notes, noteId, selectNote, createNote, deleteNote,
    folders, addFolder, editFolderName, removeFolder, moveNote,
  } = useNote();

  // which folders are closed (all start open)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // inline rename state
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // where a new folder is being created: false = not creating, null = top-level, number = inside that folder
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<number | null | false>(false);
  const [newFolderName, setNewFolderName] = useState("");

  // which note's "move to folder" menu is open
  const [movingNoteId, setMovingNoteId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

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

  // group notes by folder for the sidebar
  const rootNotes = notes.filter((n) => n.folderId === null);
  const notesByFolder = new Map<number, typeof notes>();
  for (const note of notes) {
    if (note.folderId !== null) {
      const arr = notesByFolder.get(note.folderId) ?? [];
      arr.push(note);
      notesByFolder.set(note.folderId, arr);
    }
  }

  // get child folders of a given parent
  const childFolders = (parentId: number | null) =>
    folders.filter((f) => f.parentFolder === parentId);

  // reusable note row — used inside folders and at root level
  const renderNoteRow = (note: typeof notes[number], depth: number) => (
    <div key={note.id} className="relative">
      <div className="group">
        <div
          className={`flex items-center justify-between py-1.5 text-sm rounded
            ${note.id === noteId
              ? "bg-gray-200 dark:bg-gray-700 font-medium"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          style={{ paddingLeft: `${depth * 16 + 12}px`, paddingRight: "12px" }}
        >
          <button
            onClick={() => selectNote(note.id)}
            className="truncate text-left flex-1 cursor-pointer"
          >
            {note.title}
          </button>
          <button
            onClick={() => setMovingNoteId(movingNoteId === note.id ? null : note.id)}
            className="hidden group-hover:inline ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 cursor-pointer text-xs"
            title="Move to folder"
          >
            &#x1F4C1;
          </button>
          <button
            onClick={() => deleteNote(note.id)}
            className="hidden group-hover:inline ml-1 text-gray-400 hover:text-red-500 shrink-0 cursor-pointer"
          >
            &#x2715;
          </button>
        </div>
      </div>

      {/* "move to folder" dropdown */}
      {movingNoteId === note.id && (
        <div
          data-move-menu
          className="ml-4 mr-2 my-1 rounded border border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-900 shadow-sm text-sm overflow-hidden"
        >
          <button
            onClick={() => {
              moveNote(note.id, null);
              setMovingNoteId(null);
            }}
            className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800
              ${note.folderId === null ? "text-gray-400 cursor-default" : "cursor-pointer"}`}
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
              className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800
                ${note.folderId === folder.id ? "text-gray-400 cursor-default" : "cursor-pointer"}`}
              disabled={note.folderId === folder.id}
            >
              {folder.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // renders a folder and all its children recursively
  const renderFolder = (folder: Folder, depth: number) => (
    <div key={folder.id} className="mb-0.5">
      {/* folder header */}
      <div
        className="group flex items-center py-1.5 text-sm font-medium rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        style={{ paddingLeft: `${depth * 16 + 12}px`, paddingRight: "12px" }}
      >
        <button
          onClick={() => toggleCollapse(folder.id)}
          className="mr-1 text-gray-400 text-xs cursor-pointer"
        >
          {collapsed.has(folder.id) ? "▶" : "▼"}
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
            className="flex-1 text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none"
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
            // expand the folder so the user sees the input
            setCollapsed((prev) => {
              const next = new Set(prev);
              next.delete(folder.id);
              return next;
            });
          }}
          className="hidden group-hover:inline ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 cursor-pointer"
        >
          +
        </button>
        <button
          onClick={() => createNote(folder.id)}
          className="hidden group-hover:inline ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 cursor-pointer text-xs"
          title="New note in this folder"
        >
          &#x1F4C4;
        </button>
        <button
          onClick={() => removeFolder(folder.id)}
          className="hidden group-hover:inline ml-1 text-gray-400 hover:text-red-500 shrink-0 cursor-pointer"
        >
          &#x2715;
        </button>
      </div>

      {/* folder contents (child folders + notes) — hidden when collapsed */}
      {!collapsed.has(folder.id) && (
        <>
          {childFolders(folder.id).map((child) => renderFolder(child, depth + 1))}

          {(notesByFolder.get(folder.id) ?? []).map((note) =>
            renderNoteRow(note, depth + 1)
          )}

          {/* inline input for creating a subfolder inside this folder */}
          {creatingFolderParentId === folder.id && (
            <div
              className="flex items-center py-1.5"
              style={{ paddingLeft: `${(depth + 1) * 16 + 12}px`, paddingRight: "12px" }}
            >
              <span className="mr-1 text-gray-400 text-xs">▼</span>
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
                className="flex-1 text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none"
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-screen">
      {/* click anywhere in the sidebar to close the move menu */}
      <div
        className="w-64 border-r overflow-y-auto p-4"
        onMouseDown={(e) => {
          // only close if clicking outside the dropdown itself
          if (movingNoteId !== null && !(e.target as HTMLElement).closest("[data-move-menu]")) {
            setMovingNoteId(null);
          }
        }}
      >
        {/* button row */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => createNote()}
            className="flex-1 px-3 py-2 text-sm font-medium rounded cursor-pointer
                       bg-gray-100 hover:bg-gray-200
                       dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            + Note
          </button>
          <button
            onClick={() => {
              setCreatingFolderParentId(null);
              setNewFolderName("");
            }}
            className="flex-1 px-3 py-2 text-sm font-medium rounded cursor-pointer
                       bg-gray-100 hover:bg-gray-200
                       dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            + Folder
          </button>
        </div>

        {/* inline input for new top-level folder */}
        {creatingFolderParentId === null && (
          <div className="flex items-center px-3 py-1.5 mb-1">
            <span className="mr-1 text-gray-400 text-xs">▼</span>
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
              className="flex-1 text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none"
            />
          </div>
        )}

        {/* folder tree */}
        {childFolders(null).map((folder) => renderFolder(folder, 0))}

        {/* root-level notes (not in any folder) */}
        {rootNotes.length > 0 && childFolders(null).length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
        )}
        {rootNotes.map((note) => renderNoteRow(note, 0))}
      </div>
      <div className="flex flex-col flex-1 border-r overflow-y-auto p-4">
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          className="flex-1 w-full resize-none outline-none"
          placeholder="Write your markdown here..."
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4 prose dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
