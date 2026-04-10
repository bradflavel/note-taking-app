import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PreviewProps {
  markdown: string;
}

export default function Preview({ markdown }: PreviewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 prose dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
