// STEP 0 · A bare language model
//
// An LLM does exactly one thing: given the tokens so far, it gives a
// probability for every possible next token. To generate text you pick one,
// append it, and ask again. That's the whole trick.
//
// Run:  npm run agent:0 -- "The test"
//       TEMPERATURE=1.5 npm run agent:0 -- "The agent"

import { nextTokenDistribution, sample, tokenize, train } from "./lib/tiny-lm.ts";
import { banner, color, note } from "./lib/print.ts";

const model = train(); // "training": count which token follows which in a tiny corpus
const prompt = process.argv[2] ?? "The button";
const temperature = Number(process.env.TEMPERATURE ?? 0.7);

banner("Step 0 · Next-token prediction", `prompt: "${prompt}"  temperature: ${temperature}`);

const tokens = tokenize(prompt);
for (let step = 0; step < 25; step++) {
  const distribution = nextTokenDistribution(model, tokens);
  const next = sample(distribution, temperature);

  if (step < 3) {
    const top = distribution.slice(0, 4).map((d) => `${d.token} ${(d.p * 100).toFixed(0)}%`);
    console.log(color.dim(`  after "${tokens.slice(-2).join(" ")}" → ${top.join(" · ")}  ⇒ picked "${next}"`));
  }

  tokens.push(next); // append and go again: this loop is "generation"
  if (next === ".") break;
}

console.log(`\n${color.bold(tokens.join(" "))}`);

note("Notice: it doesn't answer anything. It continues text.");
note('Try: npm run agent:0 -- "Fix the bug in" and see it ramble on, because it has never been taught to follow instructions.');
