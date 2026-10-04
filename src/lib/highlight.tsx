// A deliberately small syntax highlighter for TypeScript, JSON and diffs.
// Good enough for teaching snippets; no dependencies.

import type { ReactNode } from "react";

export type Lang = "ts" | "json" | "diff" | "text" | "md";

const KEYWORDS = new Set(
  "const let var function return if else for while true false null undefined await async import export from type new throw try catch break continue of in default class extends interface as typeof switch case".split(
    " ",
  ),
);

const PATTERN =
  /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"(?=\s*:))|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][\w$]*\b)|(<\|[a-z_]+\|>|<[A-Z]{3}>)/gm;

function highlightLine(line: string, lang: Lang): ReactNode[] {
  if (lang === "text" || lang === "md") return [line];
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of line.matchAll(PATTERN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(line.slice(last, at));
    const [text, comment, key, str, num, word, special] = m;
    let cls = "";
    if (comment) cls = "t-com";
    else if (key) cls = "t-key";
    else if (str) cls = "t-str";
    else if (num) cls = "t-num";
    else if (special) cls = "t-special";
    else if (word && KEYWORDS.has(word)) cls = "t-kw";
    out.push(cls ? <span key={i++} className={cls}>{text}</span> : text);
    last = at + text.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function highlight(code: string, lang: Lang): ReactNode[][] {
  return code.split("\n").map((line) => highlightLine(line, lang));
}
