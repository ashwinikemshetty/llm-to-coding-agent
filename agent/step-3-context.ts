// STEP 3 · Give the model your code
//
// The model only knows (a) what it learned in training, up to its knowledge
// cutoff, and (b) what is in the context window right now. To answer about
// YOUR code, the code has to be in the context. This is called grounding.
// Retrieval-augmented generation (RAG) is doing this automatically.
//
// Run:  npm run agent:3

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { callModel } from "./lib/model.ts";
import { banner, note, response, user } from "./lib/print.ts";
import { PROJECT_SOURCE } from "./lib/tools.ts";

const code = readFileSync(join(PROJECT_SOURCE, "cart.ts"), "utf8");
const question = "Our cart total is wrong: 2 keyboards ($10) + 1 mouse ($5) shows $15. Why?";
const prompt = `${question}\n\nHere is cart.ts:\n\`\`\`ts\n${code}\`\`\``;

banner("Step 3 · Grounding", "Same question, but we paste the file into the prompt.");
user(prompt);
response(await callModel({ messages: [{ role: "user", content: prompt }], max_tokens: 1024 }));

note("Correct this time. Same model, better context.");
note("But YOU had to know which file to paste, and you have to apply the fix by hand.");
