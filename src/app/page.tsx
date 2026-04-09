"use client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNote } from "@/hooks/useNote";

export default function Home() {
  const { markdown, setMarkdown, isLoading, notes, noteId, selectNote, createNote, deleteNote } = useNote();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  return (
    <div className="flex h-screen">
      <div className="w-64 border-r overflow-y-auto p-4">
        <button
          onClick={createNote}
          className="w-full mb-4 px-3 py-2 text-sm font-medium rounded
                     bg-gray-100 hover:bg-gray-200
                     dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          + New Note
        </button>
        <ul className="space-y-1">
          {notes.map((note) => (
            <li key={note.id} className="group">
              <div
                className={`flex items-center justify-between px-3 py-2 text-sm rounded
                  ${note.id === noteId
                    ? "bg-gray-200 dark:bg-gray-700 font-medium"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                <button
                  onClick={() => selectNote(note.id)}
                  className="truncate text-left flex-1"
                >
                  {note.title}
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="hidden group-hover:inline ml-2 text-gray-400 hover:text-red-500 shrink-0 cursor-pointer"
                >
                  &#x2715;
                </button>
              </div>
            </li>
          ))}
        </ul>
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