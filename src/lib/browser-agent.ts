// The workbench's agent runtime: the same loop as agent/step-*.ts, but in the
// browser, one phase at a time so you can watch it.
//
// The model is the same simulated model the Node steps use. The file system is
// an in-memory object, and run_tests really executes cart.ts and its tests.

import cartSource from "../../agent/project/cart.ts?raw";
import testSource from "../../agent/project/cart.test.ts?raw";
import summarySource from "../../agent/project/CartSummary.tsx?raw";
import agentsSource from "../../agent/project/AGENTS.md?raw";
import { simulatedModel } from "../../agent/lib/simulated-model.ts";
import {
  editFileTool,
  listFilesTool,
  readFileTool,
  runTestsTool,
  searchTool,
} from "../../agent/lib/tool-definitions.ts";
import {
  estimateTokens,
  type ContentBlock,
  type Message,
  type ModelRequest,
  type ModelResponse,
  type Tool,
  type ToolResultBlock,
  type ToolUseBlock,
} from "../../agent/lib/types.ts";

export type Files = Record<string, string>;

export const INITIAL_FILES: Files = {
  "cart.ts": cartSource,
  "cart.test.ts": testSource,
  "CartSummary.tsx": summarySource,
  "AGENTS.md": agentsSource,
};

// ---- Tests, run for real ---------------------------------------------------

type CartModule = {
  cartTotal: (items: { name: string; price: number; qty: number }[], discount?: number) => number;
  formatPrice: (n: number) => string;
};

/** Strip the few TypeScript annotations cart.ts uses, so the browser can run it. */
function loadCart(source: string): CartModule {
  const js = source
    .replace(/^export type .*$/gm, "")
    .replace(/^export /gm, "")
    .replace(/\)\s*:\s*[\w[\]]+\s*\{/g, ") {")
    .replace(/(\w+)\s*:\s*(?:CartItem\[\]|number|string)/g, "$1");
  return new Function(`${js}\nreturn { cartTotal, formatPrice };`)() as CartModule;
}

const CART = [
  { name: "Keyboard", price: 10, qty: 2 },
  { name: "Mouse", price: 5, qty: 1 },
];

export function runTests(files: Files): { output: string; passed: number; failed: number } {
  const cases: Array<[string, (m: CartModule) => [unknown, unknown]]> = [
    ["cartTotal multiplies price by quantity", (m) => [m.cartTotal(CART), 25]],
    ["cartTotal applies a percentage discount", (m) => [m.cartTotal(CART, 10), 22.5]],
    ["formatPrice shows two decimals", (m) => [m.formatPrice(22.5), "$22.50"]],
  ];
  let mod: CartModule | null = null;
  let loadError = "";
  try {
    mod = loadCart(files["cart.ts"] ?? "");
  } catch (error) {
    loadError = String(error);
  }
  const lines: string[] = [];
  let passed = 0;
  for (const [name, run] of cases) {
    if (!mod) {
      lines.push(`✖ ${name}`, `    ${loadError}`);
      continue;
    }
    const [actual, expected] = run(mod);
    if (actual === expected) {
      passed++;
      lines.push(`✔ ${name}`);
    } else {
      lines.push(`✖ ${name}`, `    actual: ${JSON.stringify(actual)},`, `    expected: ${JSON.stringify(expected)},`);
    }
  }
  const failed = cases.length - passed;
  return { output: `${lines.join("\n")}\n# pass ${passed}\n# fail ${failed}`, passed, failed };
}

// ---- Tools ------------------------------------------------------------------

function runTool(files: Files, name: string, input: Record<string, unknown>): { content: string; files: Files } {
  switch (name) {
    case "list_files":
      return { content: Object.keys(files).sort().join("\n"), files };
    case "read_file": {
      const path = String(input.path);
      if (!(path in files)) throw new Error(`No such file: ${path}`);
      return { content: files[path], files };
    }
    case "search": {
      const pattern = String(input.pattern);
      const hits: string[] = [];
      for (const [path, text] of Object.entries(files)) {
        text.split("\n").forEach((line, i) => {
          if (line.includes(pattern)) hits.push(`${path}:${i + 1}: ${line.trim()}`);
        });
      }
      return { content: hits.join("\n") || "No matches.", files };
    }
    case "edit_file": {
      const path = String(input.path);
      const oldString = String(input.old_string);
      const text = files[path];
      if (text === undefined) throw new Error(`No such file: ${path}`);
      const count = text.split(oldString).length - 1;
      if (count !== 1) throw new Error(`old_string must appear exactly once in ${path}, found ${count}.`);
      return { content: `Edited ${path}.`, files: { ...files, [path]: text.replace(oldString, String(input.new_string)) } };
    }
    case "run_tests":
      return { content: runTests(files).output, files };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---- Modes --------------------------------------------------------------------

export type ModeId = "chat" | "pasted" | "tools" | "loop" | "coding" | "production";

export type Mode = {
  id: ModeId;
  stage: string;
  label: string;
  short: string;
  tools: Tool[];
  loop: boolean;
  production?: boolean;
};

export const MODES: Mode[] = [
  { id: "chat", stage: "chat", label: "Chat only", short: "Stage 1", tools: [], loop: false },
  { id: "pasted", stage: "context", label: "+ Code in prompt", short: "Stage 3", tools: [], loop: false },
  { id: "tools", stage: "tools", label: "+ One tool", short: "Stage 4", tools: [readFileTool], loop: false },
  { id: "loop", stage: "loop", label: "+ Loop", short: "Stage 5", tools: [listFilesTool, readFileTool], loop: true },
  {
    id: "coding",
    stage: "coding-agent",
    label: "Coding agent",
    short: "Stage 6",
    tools: [listFilesTool, readFileTool, searchTool, editFileTool, runTestsTool],
    loop: true,
  },
  {
    id: "production",
    stage: "production",
    label: "+ Harness",
    short: "Stage 7",
    tools: [listFilesTool, readFileTool, searchTool, editFileTool, runTestsTool],
    loop: true,
    production: true,
  },
];

export const QUESTION = "Our cart total is wrong: 2 keyboards ($10) + 1 mouse ($5) shows $15. Why?";
export const BUG_REPORT = "Bug report: 2 keyboards ($10) + 1 mouse ($5) shows $15 in the cart, should be $25. Please fix it.";

export const PRODUCTION = {
  maxTurns: 12,
  contextBudget: 600,
  needsApproval: new Set(["edit_file", "run_tests"]),
};

export function systemPromptFor(mode: Mode, files: Files): string | undefined {
  if (!mode.production) return undefined;
  return [
    "You are a careful coding agent working in a TypeScript project.",
    "Reproduce bugs before fixing them, keep changes minimal, and verify with the tests.",
    "",
    "Project instructions (from AGENTS.md):",
    files["AGENTS.md"],
  ].join("\n");
}

function firstMessage(mode: Mode, files: Files): string {
  if (mode.id === "pasted") return `${QUESTION}\n\nHere is cart.ts:\n\`\`\`ts\n${files["cart.ts"]}\`\`\``;
  if (mode.id === "coding" || mode.id === "production") return BUG_REPORT;
  return QUESTION;
}

// ---- Run state ------------------------------------------------------------------

export type WbEvent =
  | { kind: "user"; text: string }
  | { kind: "text"; text: string; turn: number }
  | { kind: "tool_use"; block: ToolUseBlock; turn: number }
  | { kind: "tool_result"; block: ToolResultBlock; name: string }
  | { kind: "system"; text: string };

export type Phase = "call-model" | "run-tools" | "await-approval" | "done";

export type RunState = {
  mode: Mode;
  files: Files;
  messages: Message[];
  events: WbEvent[];
  phase: Phase;
  turn: number;
  lastRequest?: ModelRequest;
  lastResponse?: ModelResponse;
  usage: { input: number; output: number };
  tests?: { passed: number; failed: number; output: string };
  changed: string[];
  /** Index of the tool_use we're waiting on approval for. */
  pending?: ToolUseBlock;
  queue: ToolUseBlock[];
  results: ToolResultBlock[];
  alwaysAllow: string[];
};

export function start(mode: Mode): RunState {
  const files = { ...INITIAL_FILES };
  const text = firstMessage(mode, files);
  return {
    mode,
    files,
    messages: [{ role: "user", content: text }],
    events: [{ kind: "user", text }],
    phase: "call-model",
    turn: 0,
    usage: { input: 0, output: 0 },
    changed: [],
    queue: [],
    results: [],
    alwaysAllow: [],
  };
}

export function buildRequest(state: RunState): ModelRequest {
  return {
    system: systemPromptFor(state.mode, state.files),
    messages: state.messages,
    tools: state.mode.tools.length ? state.mode.tools : undefined,
    max_tokens: 8192,
  };
}

/** [3] Compaction: replace old tool results with a placeholder when over budget. */
function compact(state: RunState): { messages: Message[]; notes: string[] } {
  const notes: string[] = [];
  const messages = structuredClone(state.messages);
  for (const message of messages.slice(0, -4)) {
    if (estimateTokens(messages) <= PRODUCTION.contextBudget) break;
    if (typeof message.content === "string") continue;
    for (const block of message.content) {
      if (block.type === "tool_result" && !block.content.startsWith("[cleared")) {
        const saved = estimateTokens(block.content);
        block.content = `[cleared to save ~${saved} tokens; call the tool again if needed]`;
        notes.push(`Compacted an old tool result, saving about ${saved} tokens.`);
      }
    }
  }
  return { messages, notes };
}

function callModel(state: RunState): RunState {
  let next = { ...state };
  if (state.mode.production) {
    const { messages, notes } = compact(state);
    if (notes.length) {
      next = { ...next, messages, events: [...next.events, ...notes.map((text) => ({ kind: "system" as const, text }))] };
    }
  }
  const turn = next.turn + 1;
  const request = buildRequest(next);
  const response = simulatedModel(request);
  const events: WbEvent[] = [...next.events];
  for (const block of response.content) {
    if (block.type === "text") events.push({ kind: "text", text: block.text, turn });
    if (block.type === "tool_use") events.push({ kind: "tool_use", block, turn });
  }
  const queue = response.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
  const toolsAllowed = state.mode.loop || turn === 1;
  let phase: Phase = response.stop_reason === "tool_use" && toolsAllowed ? "run-tools" : "done";
  if (state.mode.production && turn >= PRODUCTION.maxTurns && phase !== "done") {
    phase = "done";
    events.push({ kind: "system", text: `Stopped: reached the limit of ${PRODUCTION.maxTurns} turns.` });
  }
  if (phase === "done") events.push({ kind: "system", text: `Finished after ${turn} model call${turn === 1 ? "" : "s"}.` });
  return {
    ...next,
    turn,
    lastRequest: request,
    lastResponse: response,
    usage: { input: next.usage.input + response.usage.input_tokens, output: next.usage.output + response.usage.output_tokens },
    messages: [...next.messages, { role: "assistant", content: response.content as ContentBlock[] }],
    events,
    phase,
    queue,
    results: [],
  };
}

function execute(state: RunState, block: ToolUseBlock): RunState {
  let files = state.files;
  let result: ToolResultBlock;
  try {
    const out = runTool(files, block.name, block.input);
    files = out.files;
    result = { type: "tool_result", tool_use_id: block.id, content: out.content };
  } catch (error) {
    result = { type: "tool_result", tool_use_id: block.id, content: String(error), is_error: true };
  }
  const changed =
    block.name === "edit_file" && !result.is_error ? [...new Set([...state.changed, String(block.input.path)])] : state.changed;
  const tests = block.name === "run_tests" ? runTests(files) : state.tests;
  return {
    ...state,
    files,
    changed,
    tests,
    results: [...state.results, result],
    events: [...state.events, { kind: "tool_result", block: result, name: block.name }],
  };
}

function deny(state: RunState, block: ToolUseBlock): RunState {
  const result: ToolResultBlock = {
    type: "tool_result",
    tool_use_id: block.id,
    content: "The user denied this action.",
    is_error: true,
  };
  return {
    ...state,
    results: [...state.results, result],
    events: [...state.events, { kind: "tool_result", block: result, name: block.name }],
  };
}

/** Run queued tools until one needs approval or the queue is empty. */
function runTools(state: RunState): RunState {
  let next = { ...state, queue: [...state.queue] };
  while (next.queue.length) {
    const block = next.queue[0];
    const needsApproval =
      next.mode.production && PRODUCTION.needsApproval.has(block.name) && !next.alwaysAllow.includes(block.name);
    if (needsApproval) return { ...next, phase: "await-approval", pending: block };
    next.queue.shift();
    next = execute(next, block);
  }
  return finishTools(next);
}

function finishTools(state: RunState): RunState {
  return {
    ...state,
    pending: undefined,
    phase: "call-model",
    messages: [...state.messages, { role: "user", content: state.results }],
  };
}

export function step(state: RunState): RunState {
  if (state.phase === "call-model") return callModel(state);
  if (state.phase === "run-tools") return runTools(state);
  return state;
}

export function approve(state: RunState, decision: "allow" | "always" | "deny"): RunState {
  const block = state.pending;
  if (!block) return state;
  let next: RunState = { ...state, queue: state.queue.slice(1), pending: undefined };
  if (decision === "always") {
    next.alwaysAllow = [...next.alwaysAllow, block.name];
    next.events = [...next.events, { kind: "system", text: `Always allowing ${block.name} from now on.` }];
  }
  next = decision === "deny" ? deny(next, block) : execute(next, block);
  return runTools({ ...next, phase: "run-tools" });
}

/** Token breakdown of the next request, for the context meter. */
export function contextBreakdown(request: ModelRequest) {
  let toolResults = 0;
  let conversation = 0;
  for (const message of request.messages) {
    if (typeof message.content === "string") {
      conversation += estimateTokens(message.content);
      continue;
    }
    for (const block of message.content) {
      if (block.type === "tool_result") toolResults += estimateTokens(block.content);
      else conversation += estimateTokens(block);
    }
  }
  return {
    system: request.system ? estimateTokens(request.system) : 0,
    tools: request.tools ? estimateTokens(request.tools) : 0,
    conversation,
    toolResults,
  };
}
