import { useId, useState, type ReactNode } from "react";
import { TERM_BY_ID } from "../content/glossary.ts";
import { STAGE_BY_ID } from "../content/stages.ts";
import { highlight, type Lang } from "../lib/highlight.tsx";
import { href } from "../lib/router.ts";

/** An inline glossary term: dotted underline, definition on hover or focus, links to the glossary. */
export function T({ id, children }: { id: string; children?: ReactNode }) {
  const term = TERM_BY_ID.get(id);
  const [open, setOpen] = useState(false);
  const popId = useId();
  if (!term) return <>{children}</>;
  const part = STAGE_BY_ID.get(term.stage)?.part ?? 1;
  return (
    <span
      className={`term part-${part}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <a
        href={href.term(id)}
        aria-describedby={open ? popId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children ?? term.term}
      </a>
      {open && (
        <span className="popover" role="tooltip" id={popId}>
          <strong>{term.term}</strong>
          {term.aka && <span className="aka">also: {term.aka}</span>}
          <span>{term.what}</span>
        </span>
      )}
    </span>
  );
}

export function CodeBlock({
  code,
  lang = "ts",
  title,
  meta,
  highlightLines = [],
  dimOthers = false,
  className = "",
}: {
  code: string;
  lang?: Lang;
  title?: string;
  meta?: ReactNode;
  highlightLines?: number[];
  dimOthers?: boolean;
  className?: string;
}) {
  const lines = highlight(code.replace(/\n$/, ""), lang);
  const marked = new Set(highlightLines);
  return (
    <div className={`code ${className}`}>
      {(title || meta) && (
        <div className="code-head">
          <span>{title}</span>
          <span>{meta}</span>
        </div>
      )}
      <pre>
        {lines.map((parts, i) => {
          const raw = code.split("\n")[i] ?? "";
          let cls = "ln";
          if (marked.has(i + 1)) cls += " hl";
          else if (dimOthers && marked.size) cls += " dim";
          if (lang === "diff" && raw.startsWith("+")) cls += " add";
          if (lang === "diff" && raw.startsWith("-")) cls += " del";
          return (
            <span key={i} className={cls}>
              {parts.length ? parts : " "}
              {"\n"}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

export function Demo({
  title,
  tag = "Try it",
  actions,
  children,
  foot,
}: {
  title: string;
  tag?: string;
  actions?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <section className="demo" aria-label={title}>
      <div className="demo-head">
        <span className="tag">{tag}</span>
        <span className="title">{title}</span>
        <span className="spacer" />
        {actions}
      </div>
      <div className="demo-body">{children}</div>
      {foot && <div className="demo-foot">{foot}</div>}
    </section>
  );
}

export function Callout({ title, children, kind }: { title?: string; children: ReactNode; kind?: "analogy" }) {
  return (
    <aside className={`callout ${kind ?? ""}`}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </aside>
  );
}

export function BigIdea({ children }: { children: ReactNode }) {
  return <p className="big-idea">{children}</p>;
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="prose">{children}</div>;
}

export type Question = {
  q: string;
  options: string[];
  answer: number;
  explain: ReactNode;
};

export function Quiz({ questions }: { questions: Question[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  return (
    <div className="quiz">
      {questions.map((question, qi) => {
        const choice = picked[qi];
        const answered = choice !== undefined;
        return (
          <div className="quiz-q" key={qi}>
            <h4>{question.q}</h4>
            <div className="quiz-options">
              {question.options.map((option, oi) => {
                let cls = "";
                if (answered && oi === question.answer) cls = "right";
                else if (answered && oi === choice) cls = "wrong";
                return (
                  <button
                    key={oi}
                    className={cls}
                    disabled={answered}
                    onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className="quiz-explain">
                {choice === question.answer ? "Right. " : "Not quite. "}
                {question.explain}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Figure({ children, caption, compact }: { children: ReactNode; caption?: ReactNode; compact?: boolean }) {
  return (
    <figure className={`diagram ${compact ? "compact" : ""}`} style={{ margin: 0 }}>
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** SVG arrow marker. Put once inside an <svg>, then use markerEnd="url(#arrow)". */
export function ArrowDefs({ id = "arrow" }: { id?: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="d-arrowhead" />
      </marker>
    </defs>
  );
}
