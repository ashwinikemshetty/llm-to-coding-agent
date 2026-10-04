// STEP 2 · Memory is just the messages you re-send
//
// The model is STATELESS. It remembers nothing between requests. A chat app
// "remembers" by sending the whole conversation again on every turn. That
// growing list has to fit in the CONTEXT WINDOW, measured in tokens.
//
// Run:  npm run agent:2

import { callModel } from "./lib/model.ts";
import { banner, color, note, response, user } from "./lib/print.ts";
import { estimateTokens, type Message } from "./lib/types.ts";

const turn1 = "Hi, I'm Asha. I'm on the checkout team.";
const turn2 = "What's my name?";

banner("Step 2a · Without history", "Each request is sent on its own.");
user(turn1);
response(await callModel({ messages: [{ role: "user", content: turn1 }], max_tokens: 1024 }));
user(turn2);
response(await callModel({ messages: [{ role: "user", content: turn2 }], max_tokens: 1024 }));
note("Forgotten. The second request had no idea the first one happened.");

banner("Step 2b · With history", "We keep an array and send all of it every time.");
const history: Message[] = [];
for (const text of [turn1, turn2]) {
  history.push({ role: "user", content: text });
  user(text);
  const reply = await callModel({ messages: history, max_tokens: 1024 });
  response(reply);
  history.push({ role: "assistant", content: reply.content }); // <- this line IS the memory
  console.log(color.dim(`   history is now ${history.length} messages ≈ ${estimateTokens(history)} tokens`));
}

banner("Step 2c · When the context window is full", "Pretend the window is only 30 tokens.");
const CONTEXT_WINDOW = 30;
const trimmed = [...history, { role: "user" as const, content: turn2 }];
while (estimateTokens(trimmed) > CONTEXT_WINDOW) trimmed.shift(); // drop the oldest message
console.log(color.dim(`   kept ${trimmed.length} of ${history.length + 1} messages`));
user(turn2);
response(await callModel({ messages: trimmed, max_tokens: 1024 }));
note("Truncation dropped the message with the name, so it's forgotten again.");
note("Real agents summarise old turns instead (compaction), or save facts to files (long-term memory).");
