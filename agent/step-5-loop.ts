// STEP 5 · The agent loop
//
// An agent is a model + tools + a loop:
//   call the model → if it asked for tools, run them and append the results → repeat
//   until the model says it's done (stop_reason "end_turn").
// The model decides the next step each time. Our code just keeps the loop going.
//
// Run:  npm run agent:5

import { callModel } from "./lib/model.ts";
import { banner, note, response, results, user } from "./lib/print.ts";
import { listFilesTool, PROJECT_SOURCE, readFileTool, runTool } from "./lib/tools.ts";
import type { Message, ToolResultBlock } from "./lib/types.ts";

const tools = [listFilesTool, readFileTool];
const task = "Our cart total is wrong: 2 keyboards ($10) + 1 mouse ($5) shows $15. Why?";

banner("Step 5 · The loop", "Same tools as step 4, plus one while loop.");
user(task);

const messages: Message[] = [{ role: "user", content: task }];

while (true) {
  const reply = await callModel({ messages, tools, max_tokens: 4096 });
  response(reply);
  messages.push({ role: "assistant", content: reply.content });

  if (reply.stop_reason !== "tool_use") break; // the model is done

  const toolResults: ToolResultBlock[] = [];
  for (const block of reply.content) {
    if (block.type !== "tool_use") continue;
    toolResults.push({ type: "tool_result", tool_use_id: block.id, content: runTool(PROJECT_SOURCE, block.name, block.input) });
  }
  messages.push({ role: "user", content: toolResults });
  results(messages.at(-1)!);
}

note(`${messages.length} messages. The model chose every step. That while loop is the core of every coding agent.`);
note("It found the bug, but it can only read. Next: tools that change code and check it.");
