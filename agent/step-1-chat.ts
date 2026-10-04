// STEP 1 · A chat model
//
// A chat model is a base model fine-tuned on conversations, so it continues
// text by *answering*. The API gives you roles (system / user / assistant),
// but under the hood they are flattened into one long string with special
// tokens, and the model is still just predicting the next token.
//
// Run:  npm run agent:1

import { callModel } from "./lib/model.ts";
import { banner, json, note, response, user } from "./lib/print.ts";
import type { ModelRequest } from "./lib/types.ts";

const request: ModelRequest = {
  system: "You are a helpful senior frontend engineer.",
  messages: [{ role: "user", content: "Our cart total is wrong: 2 keyboards ($10) + 1 mouse ($5) shows $15. Why?" }],
  max_tokens: 1024,
};

banner("Step 1 · Chat", "One request in, one response out.");
json("What we send (the request body)", request);

// Roughly what the model actually reads (every model family has its own template):
const flattened =
  `<|system|>${request.system}<|end|>\n` +
  request.messages.map((m) => `<|${m.role}|>${m.content}<|end|>`).join("\n") +
  "\n<|assistant|>";
json("What the model actually sees: one string, then it predicts what comes next", flattened);

user(String(request.messages[0].content));
response(await callModel(request));

note("It sounds confident, and it's wrong. There is no useCartStore. The model has never seen our code.");
note("That's a hallucination: plausible text, because plausible is what next-token prediction produces.");
