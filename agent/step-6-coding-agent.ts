// STEP 6 · A coding agent
//
// Same loop as step 5. The only change is the toolbox: search, edit and run
// tests. Running the tests closes the feedback loop, so the agent can check
// its own work instead of hoping it's right.
//
// It works on a temporary copy of agent/project, so the repo isn't modified.
//
// Run:  npm run agent:6

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { callModel } from "./lib/model.ts";
import { banner, color, note, response, results, user } from "./lib/print.ts";
import { createWorkspace, editFileTool, listFilesTool, readFileTool, runTestsTool, runTool, searchTool } from "./lib/tools.ts";
import type { Message, ToolResultBlock } from "./lib/types.ts";

const tools = [listFilesTool, readFileTool, searchTool, editFileTool, runTestsTool];
const workspace = createWorkspace();
const task = "Bug report: 2 keyboards ($10) + 1 mouse ($5) shows $15 in the cart, should be $25. Please fix it.";

banner("Step 6 · Coding agent", `workspace: ${workspace}`);
user(task);

const messages: Message[] = [{ role: "user", content: task }];

while (true) {
  const reply = await callModel({ messages, tools, max_tokens: 8192 });
  response(reply);
  messages.push({ role: "assistant", content: reply.content });
  if (reply.stop_reason !== "tool_use") break;

  const toolResults: ToolResultBlock[] = [];
  for (const block of reply.content) {
    if (block.type !== "tool_use") continue;
    try {
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: runTool(workspace, block.name, block.input) });
    } catch (error) {
      // Errors go back to the model as text, so it can correct itself.
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: String(error), is_error: true });
    }
  }
  messages.push({ role: "user", content: toolResults });
  results(messages.at(-1)!);
}

console.log(color.green(`\n${readFileSync(join(workspace, "cart.ts"), "utf8")}`));
note("Red → green. It reproduced the bug, found it, fixed it, and verified the fix, all in the same loop.");
