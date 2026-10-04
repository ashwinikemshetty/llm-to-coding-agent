// Interlude and stage 4-8 demos.

import { useState } from "react";
import { CodeBlock, Demo } from "../components/ui.tsx";
import { RichText } from "../components/RichText.tsx";
import { simulatedModel } from "../../agent/lib/simulated-model.ts";
import { readFileTool } from "../../agent/lib/tool-definitions.ts";
import type { Message, ModelResponse, ToolResultBlock, ToolUseBlock } from "../../agent/lib/types.ts";
import { INITIAL_FILES, QUESTION } from "../lib/browser-agent.ts";
import { href } from "../lib/router.ts";

// ---------------------------------------------------------------------------
// Fill-in-the-middle
// ---------------------------------------------------------------------------

const FIM = {
  prefix: "export function formatPrice(amount: number): string {\n  ",
  middle: "return `$${amount.toFixed(2)}`;",
  suffix: "\n}\n\nformatPrice(22.5); // \"$22.50\"",
};

export function FimDemo() {
  const [view, setView] = useState<"editor" | "training">("editor");
  return (
    <Demo
      title="Fill-in-the-middle: how autocomplete works"
      actions={
        <div className="seg" role="group" aria-label="View">
          <button aria-pressed={view === "editor"} onClick={() => setView("editor")}>
            In your editor
          </button>
          <button aria-pressed={view === "training"} onClick={() => setView("training")}>
            As training data
          </button>
        </div>
      }
      foot="Training cuts real files into prefix, middle and suffix, moves the middle to the end, and teaches the model to predict it. In the editor, your cursor is the gap."
    >
      {view === "editor" ? (
        <div className="code">
          <pre>
            <span>{FIM.prefix}</span>
            <span className="t-com">{FIM.middle}</span>
            <span>{FIM.suffix}</span>
          </pre>
        </div>
      ) : (
        <div className="code">
          <pre style={{ whiteSpace: "pre-wrap" }}>
            <span className="t-special">{"<PRE>"}</span>
            <span className="t-key">{FIM.prefix}</span>
            <span className="t-special">{"<SUF>"}</span>
            <span className="t-num">{FIM.suffix}</span>
            <span className="t-special">{"<MID>"}</span>
            <span className="t-str">{FIM.middle}</span>
          </pre>
        </div>
      )}
      <p className="small muted">
        {view === "editor"
          ? "The grey text is the suggestion. The model saw the code before the cursor and the code after it."
          : "Blue: prefix. Orange: suffix. Green: the middle the model learns to write. Same next-token prediction, different arrangement."}
      </p>
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// You are the harness
// ---------------------------------------------------------------------------

export function ToolHarnessDemo() {
  const [phase, setPhase] = useState(0);
  const messages: Message[] = [{ role: "user", content: QUESTION }];
  const request1 = { messages, tools: [readFileTool], max_tokens: 1024 };
  const response1: ModelResponse = simulatedModel(request1);
  const toolUse = response1.content.find((b): b is ToolUseBlock => b.type === "tool_use")!;
  const result: ToolResultBlock = { type: "tool_result", tool_use_id: toolUse.id, content: INITIAL_FILES["cart.ts"] };
  const messages2: Message[] = [...messages, { role: "assistant", content: response1.content }, { role: "user", content: [result] }];
  const response2 = simulatedModel({ messages: messages2, tools: [readFileTool], max_tokens: 1024 });
  const finalText = response2.content.find((b) => b.type === "text");

  const steps = [
    {
      title: "1. Your code sends the question and a tool definition",
      body: <CodeBlock lang="json" className="short" code={JSON.stringify(request1, null, 2)} />,
      action: "Send to the model",
    },
    {
      title: "2. The model replies with a request, not an action",
      body: (
        <>
          <CodeBlock lang="json" className="short" code={JSON.stringify({ stop_reason: response1.stop_reason, content: response1.content }, null, 2)} />
          <p className="small">
            The model has stopped. Nothing has been read yet. It's waiting for <b>you</b>, the harness, to decide.
          </p>
        </>
      ),
      action: `You run read_file("${String(toolUse.input.path)}")`,
    },
    {
      title: "3. You ran it. Now you report back with a tool_result",
      body: <CodeBlock lang="json" className="short" code={JSON.stringify({ role: "user", content: [{ ...result, content: result.content.slice(0, 120) + "…" }] }, null, 2)} />,
      action: "Send the result back",
    },
    {
      title: "4. With the file in its context, the model answers",
      body: finalText && finalText.type === "text" ? <RichText text={finalText.text} /> : null,
      action: "",
    },
  ];
  const current = steps[phase];

  return (
    <Demo
      title="You are the harness"
      actions={
        <button className="btn small ghost" onClick={() => setPhase(0)}>
          Start over
        </button>
      }
      foot={
        <>
          This is <a href={href.code("step-4-tools")}>step-4-tools.ts</a> one message at a time. Two model calls, and
          your code ran the tool in between.
        </>
      }
    >
      <div className="row">
        {steps.map((_, i) => (
          <span key={i} className={`status-pill ${i < phase ? "green" : i === phase ? "red" : "grey"}`} style={i === phase ? { background: "var(--p3-soft)", color: "var(--p3)" } : undefined}>
            {i + 1}
          </span>
        ))}
      </div>
      <h3>{current.title}</h3>
      {current.body}
      {current.action && (
        <div className="row">
          <button className="btn primary" onClick={() => setPhase((p) => p + 1)}>
            {current.action}
          </button>
        </div>
      )}
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// Myths
// ---------------------------------------------------------------------------

const MYTHS: Array<[string, string]> = [
  ["It learns from my corrections.", "The weights are frozen. A correction only lives in this conversation's context, or in a memory file if the tool saves one. Start a new session and it's gone."],
  ["It understands my whole codebase.", "It sees only what's in the context: files it read, search results, AGENTS.md. Everything else doesn't exist for it."],
  ["It runs code on its own.", "It writes a tool_use request. The harness runs it, under the permissions you set."],
  ["A bigger context window means it remembers everything.", "Long contexts cost more, run slower and get less reliable (context rot). Small, relevant context usually beats big context."],
  ["It searched the web for that answer.", "Only if it has a web search tool and called it. Otherwise the answer comes from training data, which ends at the knowledge cutoff."],
  ["It sounds sure, so it's right.", "Fluency is what next-token prediction optimises. Confidence isn't evidence. Tests, types and review are."],
  ["Temperature 0 makes it correct.", "It makes output more consistent, not more accurate. A wrong answer at temperature 0 is consistently wrong."],
  ["Agents are a different kind of AI.", "Same model. An agent is the model plus tools plus a loop. You've built one on this site."],
];

export function MythsDemo() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  return (
    <div className="cards">
      {MYTHS.map(([myth, fact], i) => {
        const on = flipped.has(i);
        return (
          <button
            key={i}
            className={`myth ${on ? "flipped" : ""}`}
            aria-pressed={on}
            onClick={() =>
              setFlipped((s) => {
                const n = new Set(s);
                if (n.has(i)) n.delete(i);
                else n.add(i);
                return n;
              })
            }
          >
            <span className="kind">{on ? "What's actually true" : "Myth"}</span>
            {on ? <p>{fact}</p> : <strong>“{myth}”</strong>}
            <span className="hint">{on ? "Click to see the myth" : "Click to reveal"}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

const TIMELINE: Array<{ year: string; title: string; text: string; shape: string; part: 1 | 2 | 3; stage: string }> = [
  { year: "2017", title: "The Transformer", text: "The “Attention Is All You Need” paper introduces the architecture behind every modern LLM.", shape: "the model", part: 1, stage: "llm" },
  { year: "2020", title: "Scale changes everything", text: "GPT-3 shows that a big enough next-token predictor can follow examples in the prompt (few-shot).", shape: "base model", part: 1, stage: "llm" },
  { year: "2021", title: "Autocomplete for code", text: "Codex and GitHub Copilot put fill-in-the-middle suggestions in the editor. One call per keystroke pause, no tools.", shape: "model + FIM", part: 2, stage: "how-code" },
  { year: "2022", title: "Chat goes mainstream", text: "ChatGPT shows what instruction tuning and RLHF do. The same year, ReAct proposes models that reason and act in a loop.", shape: "chat model", part: 1, stage: "chat" },
  { year: "2023", title: "Tools and long context", text: "Function calling arrives in model APIs and context windows grow past 100K tokens. SWE-bench starts measuring models on real GitHub issues.", shape: "chat + tools", part: 3, stage: "tools" },
  { year: "2024", title: "Agents start to work", text: "Models get good enough at multi-step tool use for agents in the editor. Reasoning models arrive, and MCP standardises how tools plug in.", shape: "loop + tools", part: 3, stage: "loop" },
  { year: "2025", title: "Coding agents everywhere", text: "Terminal and IDE agents such as Claude Code, Codex and Copilot's agent mode go mainstream, with project memory files, permissions and subagents.", shape: "loop + harness", part: 3, stage: "production" },
  { year: "Now", title: "Agents in the background", text: "Agents run in cloud sandboxes, often several at once, and hand back pull requests. Still the same loop.", shape: "loop + harness + cloud", part: 3, stage: "reveal" },
];

export function Timeline() {
  return (
    <div className="timeline">
      {TIMELINE.map((t) => (
        <div key={t.year} className={`tl-item part-${t.part}`}>
          <span className="tl-year">{t.year}</span>
          <div>
            <h4>{t.title}</h4>
            <p>{t.text}</p>
            <a className="shape" href={href.stage(t.stage)}>
              shape: {t.shape} →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// From our code to real products
// ---------------------------------------------------------------------------

const PRODUCT_MAP: Array<[string, string, string]> = [
  ["callModel()", "The model you pick", "The model picker in your agent. Same harness, different brain."],
  ["messages: Message[]", "The session", "Starting a new chat or clearing the conversation empties this array. Resuming a session reloads it."],
  ["read_file, search", "Read, Grep, Glob, codebase search", "How the agent finds and loads code into its context."],
  ["edit_file", "Edit / apply diff", "The diffs you review and accept."],
  ["run_tests", "Bash / terminal tool", "Lets it run your tests, linter, type checker and build."],
  ["while (true) { … }", "Agent mode", "The difference between “chat” and “agent” in your IDE."],
  ["AGENTS.md in the system prompt", "CLAUDE.md, AGENTS.md, .cursor/rules, copilot-instructions.md", "Your team's conventions, loaded every session."],
  ["approve()", "Permission prompts, allowlists, auto-accept modes", "The “Allow this command?” dialog."],
  ["compact()", "Auto-compaction, /compact", "Why long sessions keep working, and occasionally forget details."],
  ["More tools in the list", "MCP servers", "GitHub, Figma, browsers, databases, your own internal tools."],
  ["A loop that calls the loop", "Subagents, parallel agents", "Delegating research or parallel work with fresh context."],
  ["createWorkspace()", "Sandboxes, containers, worktrees, cloud agents", "Somewhere safe to run commands."],
];

export function ProductMap() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>In our 200 lines</th>
            <th>In real products</th>
            <th>What you notice as a user</th>
          </tr>
        </thead>
        <tbody>
          {PRODUCT_MAP.map(([ours, theirs, notice]) => (
            <tr key={ours}>
              <td>
                <code>{ours}</code>
              </td>
              <td>{theirs}</td>
              <td className="muted">{notice}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// What you need to build one
// ---------------------------------------------------------------------------

const CHECKLIST: Array<[string, string, string]> = [
  ["A model API", "One function: messages and tools in, content blocks out.", "llm"],
  ["A messages array", "Your memory. Append every turn, re-send every call.", "memory"],
  ["Tool definitions", "Name, description, JSON Schema. Clear descriptions matter.", "tools"],
  ["Tool implementations", "Read, search, edit, run. Validate every path and argument.", "tools"],
  ["The loop", "Call, run tools, append results, repeat until end_turn.", "loop"],
  ["A feedback signal", "Tests, type checks, lint, screenshots. The agent checks its own work.", "coding-agent"],
  ["Project memory", "AGENTS.md: how to run things, conventions, gotchas.", "production"],
  ["Permissions and a sandbox", "Ask before risky actions. Run somewhere safe.", "production"],
  ["Context management", "Token budgets, trimming tool output, compaction.", "production"],
  ["Guardrails and cost tracking", "Max turns, timeouts, token counts.", "production"],
  ["Extensibility", "MCP for more tools, subagents for delegation.", "production"],
  ["A UI", "Terminal, IDE panel, web. Show diffs and ask for approval.", "reveal"],
];

export function BuildChecklist() {
  return (
    <ul className="checklist">
      {CHECKLIST.map(([title, text, stage], i) => (
        <li key={title} className="part-3">
          <span className="box">{i + 1}</span>
          <span>
            <b>{title}</b>
            <span className="muted">{text}</span>{" "}
            <a href={href.stage(stage)} className="small">
              see stage
            </a>
          </span>
        </li>
      ))}
    </ul>
  );
}

const HABITS: Array<[string, string]> = [
  ["Give it context", "Name the files, paste the error, link the ticket. It only knows what's in the context."],
  ["Make it verifiable", "Ask it to run the tests or type checker. Agents with a feedback loop find their own mistakes."],
  ["Write an AGENTS.md", "How to run tests, conventions, gotchas. The cheapest quality boost you can buy."],
  ["Plan big changes first", "Ask for a plan, review it, then let it build. Course-correcting a plan is cheaper than a diff."],
  ["Keep sessions focused", "One task per session. Start fresh when the context gets cluttered."],
  ["Review it like a PR", "You own the code it writes. Read the diff."],
];

export function Habits() {
  return (
    <ul className="checklist">
      {HABITS.map(([title, text], i) => (
        <li key={title} className="part-2">
          <span className="box">{i + 1}</span>
          <span>
            <b>{title}</b>
            <span className="muted">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ToolsTable() {
  const rows: Array<[string, string, string]> = [
    ["list_files", "See what exists", "Orientation in an unknown repo"],
    ["search", "Find code by text", "Jump to the definition without reading everything"],
    ["read_file", "Load a file into context", "Grounding: the real code, not a guess"],
    ["edit_file", "Replace one exact snippet", "Small, reviewable changes"],
    ["run_tests", "Run the test suite", "The feedback loop: red, then green"],
  ];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>What it does</th>
            <th>Why the agent needs it</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, what, why]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>{what}</td>
              <td className="muted">{why}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
