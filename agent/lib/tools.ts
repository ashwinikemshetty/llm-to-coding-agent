// The tools. Each one is two things:
//   1. a description the MODEL reads (name, what it does, JSON Schema for input)
//   2. a plain function YOUR PROGRAM runs when the model asks for it
//
// The model never touches the file system. It only ever sees the text these
// functions return.

import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---- 1. What the model sees (see tool-definitions.ts) -----------------------

export { editFileTool, listFilesTool, readFileTool, runTestsTool, searchTool } from "./tool-definitions.ts";

// ---- 2. What your program runs ----------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
export const PROJECT_SOURCE = resolve(here, "../project");

/** Work on a throwaway copy so running the demo never changes the repo. */
export function createWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "coding-agent-demo-"));
  cpSync(PROJECT_SOURCE, dir, { recursive: true });
  return dir;
}

/** Never trust a path from the model: keep it inside the workspace. */
function safePath(root: string, path: string): string {
  const full = resolve(root, path);
  if (relative(root, full).startsWith("..")) throw new Error(`Path is outside the project: ${path}`);
  return full;
}

function listFiles(root: string): string {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort()
    .join("\n");
}

function search(root: string, pattern: string): string {
  const hits: string[] = [];
  for (const file of listFiles(root).split("\n")) {
    readFileSync(join(root, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (line.includes(pattern)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
      });
  }
  return hits.join("\n") || "No matches.";
}

function editFile(root: string, path: string, oldString: string, newString: string): string {
  const full = safePath(root, path);
  const text = readFileSync(full, "utf8");
  const count = text.split(oldString).length - 1;
  if (count !== 1) throw new Error(`old_string must appear exactly once in ${path}, found ${count}.`);
  writeFileSync(full, text.replace(oldString, newString));
  return `Edited ${path}.`;
}

function runTests(root: string): string {
  const run = spawnSync(process.execPath, ["--test", "--test-reporter=spec", "cart.test.ts"], {
    cwd: root,
    encoding: "utf8",
  });
  const output = `${run.stdout}${run.stderr}`;
  const pass = output.match(/ℹ pass (\d+)/)?.[1] ?? "?";
  const fail = output.match(/ℹ fail (\d+)/)?.[1] ?? "?";
  // Keep the useful lines only: tool results cost tokens.
  const lines = [...new Set(output.split("\n").filter((l) => /^\s*[✔✖] |actual:|expected:/.test(l)))]
    .filter((l) => !l.includes("failing tests"))
    .map((l) => l.replace(/ \([\d.]+ms\)/, ""))
    .slice(0, 20)
    .join("\n");
  return `${lines}\n# pass ${pass}\n# fail ${fail}`;
}

/** The dispatcher: tool name + input from the model -> text result for the model. */
export function runTool(root: string, name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "list_files":
      return listFiles(root);
    case "read_file":
      return readFileSync(safePath(root, String(input.path)), "utf8");
    case "search":
      return search(root, String(input.pattern));
    case "edit_file":
      return editFile(root, String(input.path), String(input.old_string), String(input.new_string));
    case "run_tests":
      return runTests(root);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
