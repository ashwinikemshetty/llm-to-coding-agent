import { useMemo, useState } from "react";
import { CodeBlock } from "../components/ui.tsx";
import { href, go } from "../lib/router.ts";
import { STAGES } from "../content/stages.ts";

// Every file in agent/, as text. This is the same code you run with `npm run agent:N`.
const SOURCES = import.meta.glob("../../agent/**/*.{ts,tsx,md}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

type FileEntry = { id: string; path: string; group: string; source: string };

const FILES: FileEntry[] = Object.entries(SOURCES)
  .map(([key, source]) => {
    const path = key.replace("../../", "");
    const name = path.replace(/^agent\//, "");
    const group = name.startsWith("step-") ? "Steps" : name.startsWith("lib/") ? "Library" : name.startsWith("project/") ? "Toy project" : "Docs";
    const id = name.replace(/\.(ts|tsx|md)$/, "").replace(/\//g, "-");
    return { id, path, group, source };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const ORDER = ["Docs", "Steps", "Library", "Toy project"];

/** Line diff via longest common subsequence. Fine for files of a few hundred lines. */
function diff(before: string, after: string): string {
  const a = before.split("\n");
  const b = after.split("\n");
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push(`  ${a[i]}`);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(`- ${a[i++]}`);
    else out.push(`+ ${b[j++]}`);
  }
  while (i < a.length) out.push(`- ${a[i++]}`);
  while (j < b.length) out.push(`+ ${b[j++]}`);
  return out.join("\n");
}

export function CodePage({ file }: { file?: string }) {
  const current = FILES.find((f) => f.id === file) ?? FILES.find((f) => f.id === "README") ?? FILES[0];
  const steps = FILES.filter((f) => f.group === "Steps");
  const stepIndex = steps.findIndex((f) => f.id === current.id);
  const previous = stepIndex > 0 ? steps[stepIndex - 1] : undefined;
  const [showDiff, setShowDiff] = useState(false);
  const stage = STAGES.find((s) => s.step === current.id);
  const lang = current.path.endsWith(".md") ? "md" : "ts";
  const diffText = useMemo(() => (previous ? diff(previous.source, current.source) : ""), [previous, current]);

  return (
    <div className="page">
      <header className="stack measure">
        <span className="eyebrow">Companion code</span>
        <h1>Build it yourself</h1>
        <p className="muted">
          The whole journey as runnable TypeScript, about 200 lines without comments. No dependencies, Node 22.18 or
          newer. Clone the repo and run <code>npm run agent:0</code> to <code>npm run agent:7</code>.
        </p>
      </header>
      <div className="code-layout">
        <nav className="code-files" aria-label="Files">
          {ORDER.map((group) => (
            <div key={group} style={{ display: "contents" }}>
              <span className="group">{group}</span>
              {FILES.filter((f) => f.group === group).map((f) => (
                <button key={f.id} aria-pressed={f.id === current.id} onClick={() => (setShowDiff(false), go(href.code(f.id)))}>
                  {f.path.replace(/^agent\/(lib\/|project\/)?/, "")}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="stack" style={{ minWidth: 0 }}>
          <div className="row">
            <code>{current.path}</code>
            {stage && (
              <a className="chip" href={href.stage(stage.id)}>
                Stage {stage.label}: {stage.title}
              </a>
            )}
            {current.group === "Steps" && (
              <span className="small muted">
                Run: <code>npm run agent:{current.id.match(/step-(\d)/)?.[1]}</code>
              </span>
            )}
            <span style={{ flex: 1 }} />
            {previous && (
              <div className="seg" role="group" aria-label="View">
                <button aria-pressed={!showDiff} onClick={() => setShowDiff(false)}>
                  Full file
                </button>
                <button aria-pressed={showDiff} onClick={() => setShowDiff(true)}>
                  Changes since {previous.id.replace(/-.*/, "")} {previous.id.match(/\d/)?.[0]}
                </button>
              </div>
            )}
          </div>
          {showDiff && previous ? (
            <CodeBlock lang="diff" code={diffText} title={`${previous.path} → ${current.path}`} />
          ) : (
            <CodeBlock lang={lang} code={current.source} title={current.path} meta={`${current.source.split("\n").length} lines`} />
          )}
        </div>
      </div>
    </div>
  );
}
