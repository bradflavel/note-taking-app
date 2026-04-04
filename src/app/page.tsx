"use client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNote } from "@/hooks/useNote";

export default function Home() {
  const { markdown, setMarkdown, isLoading } = useNote();

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
        <h2 className="text-lg font-semibold">Sidebar</h2>
        <p className="mt-2 text-sm text-gray-600">
          Folders and notes go here
        </p>
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