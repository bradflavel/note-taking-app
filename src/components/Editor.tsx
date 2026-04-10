"use client";
import { useState } from "react";
import { X, Download } from "lucide-react";

interface EditorProps {
  markdown: string;
  setMarkdown: (value: string) => void;
  tags: string[];
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  exportMarkdown: () => void;
}

export default function Editor({
  markdown, setMarkdown, tags, addTag, removeTag, exportMarkdown,
}: EditorProps) {
  const [tagInput, setTagInput] = useState("");

  return (
    <div className="flex flex-col flex-1 border-r border-border bg-editor-bg overflow-y-auto p-4">
      {/* tags and export */}
      <div className="flex flex-wrap items-center gap-2 mb-4 min-h-[28px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full
                       bg-tag-bg text-tag-text"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="text-muted-light hover:text-danger cursor-pointer"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && tagInput.trim()) {
              addTag(tagInput.trim());
              setTagInput("");
            }
            if (e.key === "Escape") {
              setTagInput("");
            }
          }}
          placeholder="Add tag..."
          className="text-xs bg-transparent outline-none w-24 text-muted"
        />
        <button
          onClick={exportMarkdown}
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-light hover:text-muted cursor-pointer shrink-0"
        >
          <Download size={14} /> Export .md
        </button>
      </div>
      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        className="flex-1 w-full resize-none outline-none bg-transparent font-mono text-sm leading-relaxed p-2"
        placeholder="Write your markdown here..."
      />
    </div>
  );
}
