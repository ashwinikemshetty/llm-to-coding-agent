# Companion code: from a bare LLM to a coding agent

Eight small TypeScript files. Each one adds one idea to the one before it.
The website walks through the same steps with live demos.

| Step | File | Adds | Run |
| ---- | ---- | ---- | --- |
| 0 | `step-0-complete.ts` | A tiny language model: next-token prediction, temperature, sampling | `npm run agent:0 -- "The test"` |
| 1 | `step-1-chat.ts` | A chat request: system prompt, messages, chat template | `npm run agent:1` |
| 2 | `step-2-memory.ts` | Memory by re-sending history, and what a full context window does | `npm run agent:2` |
| 3 | `step-3-context.ts` | Grounding: put the code in the prompt | `npm run agent:3` |
| 4 | `step-4-tools.ts` | One tool call, by hand: `tool_use` and `tool_result` | `npm run agent:4` |
| 5 | `step-5-loop.ts` | The agent loop | `npm run agent:5` |
| 6 | `step-6-coding-agent.ts` | Search, edit and test tools: red to green | `npm run agent:6` |
| 7 | `step-7-production.ts` | Project memory, permissions, compaction, max turns, cost | `npm run agent:7` |

Needs Node 22.18 or newer (it runs `.ts` files directly). No install needed for the steps.

## The model is simulated

`lib/simulated-model.ts` stands in for the LLM. It reads the request and returns
the same shapes a real API returns, so everything runs offline and the same way
every time. The messages, tools, loop, file edits and test runs are all real.

To use a real model instead:

```bash
npm install
export ANTHROPIC_API_KEY=...
USE_REAL_MODEL=1 npm run agent:6
```

Nothing in the step files changes. That's the point: the harness doesn't care
what's behind `callModel()`.

## The toy project

`project/` is a slice of a checkout page with one bug: `cartTotal` ignores item
quantities, so 2 keyboards at $10 and 1 mouse at $5 shows $15 instead of $25.
`npm run agent:test` shows the failing tests. Steps 6 and 7 work on a temporary
copy, so the repo is never changed.
