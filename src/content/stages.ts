// The journey. Each stage exists because the previous one had a problem.

export type PartId = 1 | 2 | 3;

export const PARTS: Record<PartId, { name: string; blurb: string }> = {
  1: { name: "The model", blurb: "What an LLM is, and what it isn't." },
  2: { name: "The conversation", blurb: "Memory, context, and why it hallucinates." },
  3: { name: "The agent", blurb: "Tools, a loop, and a harness around it." },
};

export type Stage = {
  id: string;
  /** What shows in the badge: "0" to "8", or a symbol for the interlude. */
  label: string;
  part: PartId;
  title: string;
  /** A few characters, for tight spaces like the concept map. */
  short: string;
  tagline: string;
  /** The problem left over from the previous stage. This is why the stage exists. */
  problem?: string;
  /** What this stage adds to the agent. */
  adds: string;
  /** Companion file in agent/, if any. */
  step?: string;
  minutes: number;
};

export const STAGES: Stage[] = [
  {
    id: "llm",
    label: "0",
    part: 1,
    title: "A bare LLM",
    short: "Bare LLM",
    tagline: "Text in, a probability for every possible next token out.",
    adds: "A model that predicts the next token",
    step: "step-0-complete",
    minutes: 11,
  },
  {
    id: "chat",
    label: "1",
    part: 1,
    title: "A chat model",
    short: "Chat model",
    tagline: "The same prediction, trained to answer.",
    problem: "A bare model only continues text. Ask it to fix a bug and it just keeps writing.",
    adds: "Fine-tuning, roles and a system prompt",
    step: "step-1-chat",
    minutes: 7,
  },
  {
    id: "memory",
    label: "2",
    part: 2,
    title: "Memory and the context window",
    short: "Memory",
    tagline: "The model forgets everything. Your code remembers for it.",
    problem: "Ask a follow-up question and the model has no idea what you said a moment ago.",
    adds: "Re-sending the history, within a token budget",
    step: "step-2-memory",
    minutes: 9,
  },
  {
    id: "context",
    label: "3",
    part: 2,
    title: "Grounding: give it your code",
    short: "Grounding",
    tagline: "It can only be right about what it can see.",
    problem: "It confidently invents a useCartStore hook. It has never seen our code.",
    adds: "The relevant code in the prompt, and RAG to find it",
    step: "step-3-context",
    minutes: 7,
  },
  {
    id: "how-code",
    label: "{ }",
    part: 2,
    title: "How LLMs learned code",
    short: "Code",
    tagline: "Code is just tokens, and tests make it checkable.",
    problem: "Why are these models so good at code in particular? And how can text ever change a file?",
    adds: "Code pretraining, fill-in-the-middle, RL on tests",
    minutes: 5,
  },
  {
    id: "tools",
    label: "4",
    part: 3,
    title: "Tools",
    short: "Tools",
    tagline: "The model asks. Your code acts.",
    problem: "You had to find the right file and paste it in yourself. The model should fetch what it needs.",
    adds: "Tool definitions, tool_use and tool_result",
    step: "step-4-tools",
    minutes: 9,
  },
  {
    id: "loop",
    label: "5",
    part: 3,
    title: "The agent loop",
    short: "Loop",
    tagline: "Call the model, run its tools, repeat until it's done.",
    problem: "One tool call isn't enough. Real tasks take several steps, and the model has to choose them.",
    adds: "A while loop around the model",
    step: "step-5-loop",
    minutes: 7,
  },
  {
    id: "coding-agent",
    label: "6",
    part: 3,
    title: "A coding agent",
    short: "Coding agent",
    tagline: "Search, edit, run the tests. Red to green.",
    problem: "It found the bug, but it can't fix it, and it can't check whether a fix works.",
    adds: "Edit and test tools: a feedback loop",
    step: "step-6-coding-agent",
    minutes: 9,
  },
  {
    id: "production",
    label: "7",
    part: 3,
    title: "The production harness",
    short: "Harness",
    tagline: "Memory, permissions, context and cost.",
    problem: "It works on a toy. A real repo needs your conventions, your approval, and a way to stay inside the context window.",
    adds: "AGENTS.md, permissions, compaction, caching, MCP, subagents",
    step: "step-7-production",
    minutes: 9,
  },
  {
    id: "reveal",
    label: "8",
    part: 3,
    title: "The real thing",
    short: "Real thing",
    tagline: "Every coding agent is this loop, plus polish.",
    problem: "So what are Claude Code, Cursor and Copilot, really?",
    adds: "The map from our 200 lines to real products",
    minutes: 7,
  },
];

export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

export function neighbours(id: string) {
  const i = STAGES.findIndex((s) => s.id === id);
  return { prev: STAGES[i - 1], next: STAGES[i + 1] };
}
