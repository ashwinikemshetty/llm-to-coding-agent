// STEP 7 · From demo to product
//
// The loop from step 6 is the engine. Real coding agents add a harness around
// it. Here are five of those pieces, each marked with [n]:
//   [1] Project memory: instructions loaded from AGENTS.md into the system prompt
//   [2] Permissions: ask a human before anything that changes the world
//   [3] Context management: shrink old tool results when the context gets big
//   [4] Guardrails: a max number of turns so it can't loop forever
//   [5] Cost tracking: count tokens on every call
//
// Run:  npm run agent:7          (asks before edits and test runs)
//       npm run agent:7 -- --yes (approves everything)

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { callModel } from "./lib/model.ts";
import { banner, color, note, response, results, user } from "./lib/print.ts";
import { createWorkspace, editFileTool, listFilesTool, readFileTool, runTestsTool, runTool, searchTool } from "./lib/tools.ts";
import { estimateTokens, type Message, type ToolResultBlock } from "./lib/types.ts";

const tools = [listFilesTool, readFileTool, searchTool, editFileTool, runTestsTool];
const workspace = createWorkspace();
const task = "Bug report: 2 keyboards ($10) + 1 mouse ($5) shows $15 in the cart, should be $25. Please fix it.";

const MAX_TURNS = 12; // [4]
const CONTEXT_BUDGET = 600; // [3] tokens (tiny on purpose, so you can see it happen)
const NEEDS_APPROVAL = new Set(["edit_file", "run_tests"]); // [2]
const autoApprove = process.argv.includes("--yes") || !process.stdin.isTTY;

// [1] Project memory: the agent reads the team's conventions on every run.
const system = [
  "You are a careful coding agent working in a TypeScript project.",
  "Reproduce bugs before fixing them, keep changes minimal, and verify with the tests.",
  "",
  "Project instructions (from AGENTS.md):",
  readFileSync(join(workspace, "AGENTS.md"), "utf8"),
].join("\n");

const prompt = createInterface({ input: process.stdin, output: process.stdout });
async function approve(name: string, input: Record<string, unknown>): Promise<boolean> {
  if (!NEEDS_APPROVAL.has(name)) return true;
  if (autoApprove) {
    console.log(color.dim(`   [2] auto-approved ${name}`));
    return true;
  }
  const answer = await prompt.question(color.yellow(`   [2] Allow ${name}(${JSON.stringify(input)})? [y/N] `));
  return answer.trim().toLowerCase().startsWith("y");
}

// [3] Keep the newest tool results; replace older ones with a short placeholder.
function compact(messages: Message[]) {
  for (const message of messages.slice(0, -4)) {
    if (estimateTokens(messages) <= CONTEXT_BUDGET) return;
    if (typeof message.content === "string") continue;
    for (const block of message.content) {
      if (block.type === "tool_result" && !block.content.startsWith("[cleared")) {
        const saved = estimateTokens(block.content);
        block.content = `[cleared to save ~${saved} tokens; call the tool again if needed]`;
        console.log(color.dim(`   [3] compacted an old tool result (~${saved} tokens)`));
      }
    }
  }
}

banner("Step 7 · Production harness", `workspace: ${workspace}`);
user(task);

const messages: Message[] = [{ role: "user", content: task }];
const usage = { input: 0, output: 0 };

for (let turn = 1; turn <= MAX_TURNS; turn++) {
  compact(messages);
  const reply = await callModel({ system, messages, tools, max_tokens: 8192 });
  usage.input += reply.usage.input_tokens; // [5]
  usage.output += reply.usage.output_tokens;
  response(reply);
  messages.push({ role: "assistant", content: reply.content });
  if (reply.stop_reason !== "tool_use") break;
  if (turn === MAX_TURNS) console.log(color.red("   [4] max turns reached, stopping"));

  const toolResults: ToolResultBlock[] = [];
  for (const block of reply.content) {
    if (block.type !== "tool_use") continue;
    if (!(await approve(block.name, block.input))) {
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "The user denied this action.", is_error: true });
      continue;
    }
    try {
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: runTool(workspace, block.name, block.input) });
    } catch (error) {
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: String(error), is_error: true });
    }
  }
  messages.push({ role: "user", content: toolResults });
  results(messages.at(-1)!);
}
prompt.close();

console.log(color.dim(`\n[5] total tokens: ${usage.input} in / ${usage.output} out across ${messages.length} messages`));
note("Every input token is re-sent on every turn. That's why context management and prompt caching matter.");
note("Add MCP servers (more tools), subagents (a loop that calls this loop) and a nice UI, and you have a coding agent product.");
