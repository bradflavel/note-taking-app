"use client";
import { useRef, useEffect } from "react";
import { useNote } from "@/hooks/useNote";
import Sidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";
import Preview from "@/components/Preview";

export default function Home() {
  const {
    markdown, setMarkdown, isLoading,
    notes, noteId, selectNote, createNote, deleteNote,
    folders, addFolder, editFolderName, removeFolder, moveNote,
    tags, addTag, removeTag,
    searchQuery, searchResults, setSearch,
    flushSave,
  } = useNote();

  const searchInputRef = useRef<HTMLInputElement>(null);

  const exportMarkdown = () => {
    const title = markdown.split("\n")[0]?.replace(/^#+\s*/, "").trim() || "Untitled";
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "s") {
        e.preventDefault();
        flushSave();
      } else if (e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "N" && e.shiftKey) {
        e.preventDefault();
        createNote();
      } else if (e.key === "D" && e.shiftKey) {
        e.preventDefault();
        if (noteId !== null) deleteNote(noteId);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flushSave, createNote, deleteNote, noteId]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        notes={notes} noteId={noteId} selectNote={selectNote}
        createNote={createNote} deleteNote={deleteNote}
        folders={folders} addFolder={addFolder}
        editFolderName={editFolderName} removeFolder={removeFolder}
        moveNote={moveNote}
        searchQuery={searchQuery} searchResults={searchResults}
        setSearch={setSearch} searchInputRef={searchInputRef}
      />
      <Editor
        markdown={markdown} setMarkdown={setMarkdown}
        tags={tags} addTag={addTag} removeTag={removeTag}
        exportMarkdown={exportMarkdown}
      />
      <Preview markdown={markdown} />
    </div>
  );
}
