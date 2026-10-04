// STEP 4 · Tools (function calling)
//
// We describe a tool to the model: a name, a description, and a JSON Schema.
// The model can't run anything. When it wants the tool it replies with a
// structured tool_use block, stop_reason "tool_use", and stops.
// OUR code runs the function and sends the result back as a tool_result.
//
// This file does it by hand, once, so you can see every message.
//
// Run:  npm run agent:4

import { callModel } from "./lib/model.ts";
import { banner, json, note, response, user } from "./lib/print.ts";
import { PROJECT_SOURCE, readFileTool, runTool } from "./lib/tools.ts";
import type { Message, ToolResultBlock } from "./lib/types.ts";

const messages: Message[] = [
  { role: "user", content: "Our cart total is wrong: 2 keyboards ($10) + 1 mouse ($5) shows $15. Why?" },
];

banner("Step 4 · Tool use", "The model asks. We run. We report back.");
json("The tool definition the model reads", readFileTool);
user(String(messages[0].content));

// Call 1: the model decides it needs to read a file.
const first = await callModel({ messages, tools: [readFileTool], max_tokens: 1024 });
response(first);
json("The model's reply is DATA, not an action", first.content);

// Our code does the actual work.
const toolUse = first.content.find((b) => b.type === "tool_use");
if (!toolUse || toolUse.type !== "tool_use") throw new Error("Expected a tool_use block");
const result: ToolResultBlock = {
  type: "tool_result",
  tool_use_id: toolUse.id,
  content: runTool(PROJECT_SOURCE, toolUse.name, toolUse.input),
};

messages.push({ role: "assistant", content: first.content });
messages.push({ role: "user", content: [result] });
json("We send the tool's output back as a user message", messages.at(-1));

// Call 2: the model answers with the file in its context.
response(await callModel({ messages, tools: [readFileTool], max_tokens: 1024 }));

note("Two requests, and we wrote the glue by hand. What if it needs 5 tools in a row? Next: a loop.");
