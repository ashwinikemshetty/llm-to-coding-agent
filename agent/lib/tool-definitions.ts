// What the model sees: a name, a description, and a JSON Schema for the input.
// Kept in its own file (no node:* imports) so the website can show the exact same definitions.

import type { Tool } from "./types.ts";

export const listFilesTool: Tool = {
  name: "list_files",
  description: "List every file in the project.",
  input_schema: { type: "object", properties: {} },
};

export const readFileTool: Tool = {
  name: "read_file",
  description: "Read a file from the project and return its full contents.",
  input_schema: {
    type: "object",
    properties: { path: { type: "string", description: "Path relative to the project root, e.g. cart.ts" } },
    required: ["path"],
  },
};

export const searchTool: Tool = {
  name: "search",
  description: "Search every file for a text pattern. Returns matching lines as path:line: text.",
  input_schema: {
    type: "object",
    properties: { pattern: { type: "string", description: "Text to look for" } },
    required: ["pattern"],
  },
};

export const editFileTool: Tool = {
  name: "edit_file",
  description:
    "Replace one exact snippet in a file. old_string must appear exactly once. Read the file first.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path relative to the project root" },
      old_string: { type: "string", description: "Exact text to replace" },
      new_string: { type: "string", description: "Replacement text" },
    },
    required: ["path", "old_string", "new_string"],
  },
};

export const runTestsTool: Tool = {
  name: "run_tests",
  description: "Run the project's unit tests and return the output.",
  input_schema: { type: "object", properties: {} },
};
