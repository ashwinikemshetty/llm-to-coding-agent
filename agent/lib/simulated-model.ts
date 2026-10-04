// A SIMULATED model. This is not an LLM.
//
// It is a short script that reads the request and returns the same response
// shapes a real LLM API returns (text blocks, tool_use blocks, stop_reason,
// usage). That lets every step run offline, for free, and the same way every
// time, which is what you want on a projector.
//
// Everything *around* the model (the messages, the tools, the loop, the test
// run) is real. Set USE_REAL_MODEL=1 and the same steps call a real model
// instead (see lib/model.ts). The website's workbench runs this file too.
//
// It works in Node and the browser: no imports from node:*.

import {
  estimateTokens,
  textOf,
  type ContentBlock,
  type Message,
  type ModelRequest,
  type ModelResponse,
} from "./types.ts";

type Call = {
  name: string;
  input: Record<string, unknown>;
  result?: string;
  isError?: boolean;
};

/** Every tool call made so far in the conversation, paired with its result. */
function toolCalls(messages: Message[]): Call[] {
  const calls = new Map<string, Call>();
  for (const message of messages) {
    if (typeof message.content === "string") continue;
    for (const block of message.content) {
      if (block.type === "tool_use") calls.set(block.id, { name: block.name, input: block.input });
      if (block.type === "tool_result") {
        const call = calls.get(block.tool_use_id);
        if (call) {
          call.result = block.content;
          call.isError = block.is_error;
        }
      }
    }
  }
  return [...calls.values()];
}

/** Spots the cart bug the way a reader would: a reduce that adds price but never uses qty. */
export function diagnoseCart(code: string): { buggy: string; fixed: string } | null {
  const line = code
    .split("\n")
    .find((l) => l.includes("reduce(") && l.includes("item.price") && !l.includes("qty"));
  if (!line) return null;
  const buggy = line.trim();
  return { buggy, fixed: buggy.replace("item.price", "item.price * item.qty") };
}

function respond(req: ModelRequest, content: ContentBlock[], stop_reason: ModelResponse["stop_reason"]): ModelResponse {
  return {
    content,
    stop_reason,
    usage: { input_tokens: estimateTokens(req), output_tokens: estimateTokens(content) },
  };
}

function reply(req: ModelRequest, text: string): ModelResponse {
  return respond(req, [{ type: "text", text }], "end_turn");
}

function useTool(req: ModelRequest, preface: string, name: string, input: Record<string, unknown>): ModelResponse {
  const previous = toolCalls(req.messages).length;
  const id = `toolu_${String(previous + 1).padStart(2, "0")}`;
  return respond(req, [{ type: "text", text: preface }, { type: "tool_use", id, name, input }], "tool_use");
}

const passed = (output = "") => /# fail 0/.test(output);

// ---------------------------------------------------------------------------
// Policy 1: no tools. The model can only talk.
// ---------------------------------------------------------------------------
function chatPolicy(req: ModelRequest): ModelResponse {
  const userTexts = req.messages.filter((m) => m.role === "user").map((m) => textOf(m.content));
  const last = userTexts.at(-1) ?? "";
  const earlier = userTexts.slice(0, -1).join("\n");

  if (/what('?s| is) my name|who am i|do you remember/i.test(last)) {
    const name = earlier.match(/\b(?:I'm|I am|my name is)\s+([A-Z][a-z]+)/)?.[1];
    const team = earlier.match(/on the (\w+) team/i)?.[1];
    if (!name) {
      return reply(
        req,
        "I don't know your name. I can't see any earlier messages in this conversation, so this request is all I have.",
      );
    }
    return reply(req, `You're ${name}${team ? `, and you work on the ${team} team` : ""}.`);
  }

  const diagnosis = diagnoseCart(req.messages.map((m) => textOf(m.content)).join("\n"));
  if (diagnosis) {
    return reply(
      req,
      [
        "The bug is in `cartTotal`. The reducer adds each item's price once and ignores the quantity:",
        "```ts",
        diagnosis.buggy,
        "```",
        "Multiply by `qty`:",
        "```ts",
        diagnosis.fixed,
        "```",
        "2 keyboards at $10 and 1 mouse at $5 then come to $25, as expected.",
      ].join("\n"),
    );
  }

  if (/cart|total|checkout|bug/i.test(last)) {
    // No code in context, so the model fills the gap with something plausible.
    return reply(
      req,
      [
        "This usually happens when your `useCartStore` selector returns stale state after `updateQuantity` runs.",
        "Wrap the total in `useMemo` with `[cart.items]` as the dependency, and make sure the reducer returns a new array:",
        "```ts",
        "const total = useMemo(() => calculateTotal(cart.items), [cart.items]);",
        "```",
      ].join("\n"),
    );
  }

  const name = last.match(/\b(?:I'm|I am|my name is)\s+([A-Z][a-z]+)/)?.[1];
  if (name) return reply(req, `Nice to meet you, ${name}! What are you working on today?`);

  return reply(req, "Happy to help. What are you working on?");
}

// ---------------------------------------------------------------------------
// Policy 2: read-only tools. The model can look, but not change anything.
// ---------------------------------------------------------------------------
function readingPolicy(req: ModelRequest, toolNames: Set<string>): ModelResponse {
  const calls = toolCalls(req.messages);
  const listed = calls.find((c) => c.name === "list_files");
  const read = calls.find((c) => c.name === "read_file" && !c.isError);

  if (toolNames.has("list_files") && !listed) {
    return useTool(req, "Let me see which files are in the project.", "list_files", {});
  }
  if (!read) {
    return useTool(req, "`cartTotal` most likely lives in cart.ts. Reading it.", "read_file", { path: "cart.ts" });
  }
  const diagnosis = diagnoseCart(read.result ?? "");
  if (!diagnosis) return reply(req, "I read cart.ts but didn't find the problem there.");
  return reply(
    req,
    [
      "Found it in cart.ts. The reducer ignores quantity:",
      "```ts",
      diagnosis.buggy,
      "```",
      "Change it to:",
      "```ts",
      diagnosis.fixed,
      "```",
      "I can't edit files with the tools I have, so you'll need to apply this change.",
    ].join("\n"),
  );
}

// ---------------------------------------------------------------------------
// Policy 3: coding tools. Reproduce, locate, read, fix, verify.
// ---------------------------------------------------------------------------
function codingPolicy(req: ModelRequest, toolNames: Set<string>): ModelResponse {
  const calls = toolCalls(req.messages);
  const of = (name: string) => calls.filter((c) => c.name === name);
  const tests = of("run_tests");
  const searches = of("search");
  const reads = of("read_file").filter((c) => !c.isError);
  const edits = of("edit_file");

  if (tests.length === 0) {
    return useTool(req, "First I'll run the tests to see the failure for myself.", "run_tests", {});
  }
  if (passed(tests[0].result) && edits.length === 0) {
    return reply(req, "All tests already pass, so there's nothing to fix.");
  }
  if (toolNames.has("search") && searches.length === 0) {
    return useTool(req, "Two `cartTotal` tests fail. Let me find where it's defined.", "search", {
      pattern: "function cartTotal",
    });
  }
  if (reads.length === 0) {
    const hit = searches[0]?.result?.split("\n").find((l) => l.includes("function cartTotal"));
    const path = hit?.split(":")[0] || "cart.ts";
    return useTool(req, `It's in ${path}. Reading the file.`, "read_file", { path });
  }

  const path = String(reads.at(-1)?.input.path ?? "cart.ts");
  const diagnosis = diagnoseCart(reads.at(-1)?.result ?? "");

  if (edits.length === 0) {
    if (!diagnosis) return reply(req, `I read ${path} but couldn't find the cause of the failing tests.`);
    return useTool(
      req,
      "Found it: the reducer adds `item.price` but never multiplies by `item.qty`. Fixing that one line.",
      "edit_file",
      { path, old_string: diagnosis.buggy, new_string: diagnosis.fixed },
    );
  }
  if (edits.at(-1)?.isError) {
    return reply(req, `My edit to ${path} failed: ${edits.at(-1)?.result}. I've stopped so you can take a look.`);
  }
  if (tests.length < 2) {
    return useTool(req, "Now I'll re-run the tests to check the fix.", "run_tests", {});
  }
  if (passed(tests.at(-1)?.result)) {
    return reply(
      req,
      [
        `Fixed. \`cartTotal\` in ${path} ignored item quantities, so 2 × $10 + 1 × $5 came out as $15 instead of $25.`,
        "",
        "Change:",
        "```diff",
        `- ${diagnosis?.buggy ?? String(edits[0].input.old_string)}`,
        `+ ${String(edits[0].input.new_string)}`,
        "```",
        "All 3 tests pass now.",
      ].join("\n"),
    );
  }
  return reply(req, "The tests still fail after my change. Here is where I got to, so you can take over.");
}

/** Same signature as a real model call: request in, response out. */
export function simulatedModel(req: ModelRequest): ModelResponse {
  const toolNames = new Set((req.tools ?? []).map((t) => t.name));
  if (toolNames.has("edit_file") || toolNames.has("run_tests")) return codingPolicy(req, toolNames);
  if (toolNames.has("read_file")) return readingPolicy(req, toolNames);
  return chatPolicy(req);
}
