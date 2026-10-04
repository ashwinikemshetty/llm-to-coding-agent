import type { ReactNode } from "react";
import { CodeBlock } from "./ui.tsx";
import type { Lang } from "../lib/highlight.tsx";

/** Renders model text: ``` fences become code blocks, `ticks` become inline code. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/```(\w*)\n([\s\S]*?)```/g);
  const out: ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i].trim();
    if (prose) out.push(<span key={`p${i}`}>{inline(prose)}</span>);
    if (i + 2 < parts.length) {
      const lang = (parts[i + 1] || "ts") as Lang;
      out.push(<CodeBlock key={`c${i}`} code={parts[i + 2]} lang={lang === "diff" ? "diff" : "ts"} />);
    }
  }
  return <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>{out}</span>;
}

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((piece, i) =>
    piece.startsWith("`") && piece.endsWith("`") ? <code key={i}>{piece.slice(1, -1)}</code> : piece,
  );
}
