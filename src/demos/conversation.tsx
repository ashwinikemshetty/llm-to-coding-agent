// Stage 1-3 demos: base vs chat, chat templates, memory, context budget, RAG.

import { useMemo, useState } from "react";
import { CodeBlock, Demo, T } from "../components/ui.tsx";
import { ContextMeter } from "../components/ContextMeter.tsx";
import { simulatedModel } from "../../agent/lib/simulated-model.ts";
import { estimateTokens, textOf, type Message } from "../../agent/lib/types.ts";

// ---------------------------------------------------------------------------
// Base model vs chat model
// ---------------------------------------------------------------------------

const BASE_VS_CHAT = [
  {
    prompt: "How do I center a div?",
    base: "How do I center a div vertically? How do I center a div in a flexbox? How do I make a div full height? These are the questions every new developer asks. In this article we will",
    chat: "Use flexbox on the parent:\n\n.parent { display: flex; justify-content: center; align-items: center; }\n\nOr with grid: .parent { display: grid; place-items: center; }",
  },
  {
    prompt: "Fix the bug in cartTotal",
    base: "Fix the bug in cartTotal #412\n\nOpened by mkhan · 3 comments\n\nSteps to reproduce:\n1. Add two items to the cart\n2. Open checkout\n3. Total is",
    chat: "Happy to help. Could you share the cartTotal function and what result you expect versus what you get?",
  },
  {
    prompt: "The three primary colours are",
    base: "The three primary colours are red, yellow and blue. The three secondary colours are orange, green and purple. Mixing a primary colour with a secondary colour gives",
    chat: "In paint (subtractive) mixing they're red, yellow and blue. For light (additive), as on screens, they're red, green and blue.",
  },
];

export function BaseVsChatDemo() {
  const [i, setI] = useState(0);
  const item = BASE_VS_CHAT[i];
  return (
    <Demo title="Same prompt, two models" foot="Illustrative outputs. The base model continues the text as if it were a web page; the chat model answers.">
      <div className="row">
        {BASE_VS_CHAT.map((x, n) => (
          <button key={x.prompt} className="chip" aria-pressed={n === i} onClick={() => setI(n)}>
            {x.prompt}
          </button>
        ))}
      </div>
      <div className="split">
        <div className="pane">
          <span className="pane-title">
            <T id="base-model">Base model</T> (after pretraining only)
          </span>
          <p style={{ whiteSpace: "pre-wrap" }}>
            <b>{item.prompt}</b>
            <span className="muted"> {item.base.slice(item.prompt.length)}</span>
          </p>
        </div>
        <div className="pane">
          <span className="pane-title">
            <T id="chat-model">Chat model</T> (after fine-tuning and RLHF)
          </span>
          <div className="chat">
            <div className="bubble user">{item.prompt}</div>
            <div className="bubble assistant">{item.chat}</div>
          </div>
        </div>
      </div>
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// Chat template
// ---------------------------------------------------------------------------

const TEMPLATE_REQUEST = {
  system: "You are a helpful senior frontend engineer.",
  messages: [
    { role: "user", content: "What does useMemo do?" },
    { role: "assistant", content: "It caches a computed value between renders." },
    { role: "user", content: "When should I avoid it?" },
  ],
};

export function ChatTemplateDemo() {
  const [view, setView] = useState<"ui" | "json" | "tokens">("ui");
  const flattened =
    `<|system|>${TEMPLATE_REQUEST.system}<|end|>\n` +
    TEMPLATE_REQUEST.messages.map((m) => `<|${m.role}|>${m.content}<|end|>`).join("\n") +
    "\n<|assistant|>";
  return (
    <Demo
      title="Three views of the same conversation"
      actions={
        <div className="seg" role="group" aria-label="View">
          <button aria-pressed={view === "ui"} onClick={() => setView("ui")}>
            Chat UI
          </button>
          <button aria-pressed={view === "json"} onClick={() => setView("json")}>
            API request
          </button>
          <button aria-pressed={view === "tokens"} onClick={() => setView("tokens")}>
            What the model reads
          </button>
        </div>
      }
      foot="Every model family has its own special tokens. The idea is the same: roles are markers inside one long sequence, and the model predicts what comes after the last <|assistant|>."
    >
      {view === "ui" && (
        <div className="chat">
          <div className="small muted">System: {TEMPLATE_REQUEST.system}</div>
          {TEMPLATE_REQUEST.messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.content}
            </div>
          ))}
        </div>
      )}
      {view === "json" && <CodeBlock lang="json" code={JSON.stringify(TEMPLATE_REQUEST, null, 2)} />}
      {view === "tokens" && <CodeBlock lang="ts" code={flattened} />}
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// Memory: stateless model, history, context window, truncation vs summary
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  "Hi, I'm Asha. I'm on the checkout team.",
  "Can you help me with a bug later?",
  "We use React and TypeScript.",
  "What's my name?",
];

type Strategy = "drop" | "summarise";

export function MemoryDemo() {
  const [history, setHistory] = useState<Message[]>([]);
  const [sendHistory, setSendHistory] = useState(true);
  const [windowSize, setWindowSize] = useState(120);
  const [strategy, setStrategy] = useState<Strategy>("drop");
  const [draft, setDraft] = useState("");
  const [lastSent, setLastSent] = useState<Message[]>([]);
  const [forgotten, setForgotten] = useState(0);
  /** Messages before this index were not in the last request. */
  const [cutoff, setCutoff] = useState(0);

  /** Fit the conversation into the window. Returns the messages actually sent. */
  function fit(all: Message[]): { sent: Message[]; dropped: number } {
    if (!sendHistory) return { sent: all.slice(-1), dropped: all.length - 1 };
    const sent = [...all];
    let dropped = 0;
    while (estimateTokens(sent) > windowSize && sent.length > 1) {
      sent.shift();
      dropped++;
    }
    if (strategy === "summarise" && dropped > 0) {
      const removed = all.slice(0, dropped);
      const facts = removed
        .filter((m) => m.role === "user")
        .map((m) => textOf(m.content))
        .join(" ");
      const name = facts.match(/\b(?:I'm|I am|my name is)\s+([A-Z][a-z]+)/)?.[1];
      const team = facts.match(/on the (\w+) team/i)?.[1];
      const summary = `[Summary of ${dropped} earlier messages] ${name ? `The user said: I'm ${name}` : "Small talk"}${team ? `, on the ${team} team` : ""}.`;
      return { sent: [{ role: "user", content: summary }, ...sent], dropped };
    }
    return { sent, dropped };
  }

  function send(text: string) {
    if (!text.trim()) return;
    const all: Message[] = [...history, { role: "user", content: text }];
    const { sent, dropped } = fit(all);
    const reply = simulatedModel({ messages: sent, max_tokens: 512 });
    setLastSent(sent);
    setForgotten(dropped);
    setCutoff(dropped);
    setHistory([...all, { role: "assistant", content: textOf(reply.content) }]);
    setDraft("");
  }

  const used = estimateTokens(lastSent);
  return (
    <Demo
      title="Where does a chatbot's memory live?"
      actions={
        <button className="btn small ghost" onClick={() => (setHistory([]), setLastSent([]), setForgotten(0), setCutoff(0))}>
          Start over
        </button>
      }
      foot="The replies come from the same simulated model as the companion code. It only knows what's in the request."
    >
      <div className="row">
        <label className="row small">
          <input id="send-history" type="checkbox" checked={sendHistory} onChange={(e) => setSendHistory(e.target.checked)} />
          Re-send the conversation on every turn
        </label>
        <label className="field" style={{ minWidth: 200, flex: 1 }}>
          <span>
            <T id="context-window">Context window</T>: <b className="tabular">{windowSize}</b> tokens (tiny, for the demo)
          </span>
          <input id="window-size" type="range" min={30} max={200} step={10} value={windowSize} onChange={(e) => setWindowSize(Number(e.target.value))} />
        </label>
        <div className="seg" role="group" aria-label="When the window is full">
          <button aria-pressed={strategy === "drop"} onClick={() => setStrategy("drop")}>
            Drop oldest
          </button>
          <button aria-pressed={strategy === "summarise"} onClick={() => setStrategy("summarise")}>
            Summarise oldest
          </button>
        </div>
      </div>
      <div className="split">
        <div className="pane">
          <span className="pane-title">What you see</span>
          <div className="chat" style={{ minHeight: 160 }}>
            {history.length === 0 && <p className="muted small">Pick a message below to start. Try introducing yourself, then asking “What's my name?”.</p>}
            {history.map((m, i) => (
              <div key={i} className={`bubble ${m.role} ${i < cutoff ? "forgotten" : ""}`} title={i < cutoff ? "Not sent in the last request" : undefined}>
                {textOf(m.content)}
              </div>
            ))}
          </div>
          <div className="row">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input id="memory-draft" className="input" style={{ flex: 1, minWidth: 0 }} placeholder="Or type a message" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn primary" type="submit">
              Send
            </button>
          </form>
        </div>
        <div className="pane">
          <span className="pane-title">What the model received last turn</span>
          <ContextMeter capacity={windowSize} segments={[{ label: "messages", tokens: used, color: "var(--p2)" }]} />
          {lastSent.length ? (
            <CodeBlock lang="json" className="short" code={JSON.stringify({ messages: lastSent }, null, 2)} />
          ) : (
            <p className="muted small">Nothing sent yet.</p>
          )}
          {forgotten > 0 && (
            <p className="small" style={{ color: "var(--bad)" }}>
              {sendHistory
                ? `${forgotten} older message${forgotten === 1 ? "" : "s"} didn't fit and ${strategy === "drop" ? "were dropped" : "were replaced by a summary"}.`
                : "History is off: only the latest message was sent."}
            </p>
          )}
        </div>
      </div>
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// Context budget of a real coding agent
// ---------------------------------------------------------------------------

export function ContextBudgetDemo() {
  const [turn, setTurn] = useState(12);
  const capacity = 200_000;
  const fixed = { system: 3_000, tools: 14_000, memory: 2_500 };
  // Context grows each turn; past 80% the harness compacts down to a summary.
  const history = useMemo(() => {
    const points: Array<{ conv: number; results: number; compacted: boolean }> = [];
    let conv = 0;
    let results = 0;
    for (let t = 1; t <= 60; t++) {
      conv += 600;
      results += 3_400;
      let compacted = false;
      if (fixed.system + fixed.tools + fixed.memory + conv + results > capacity * 0.8) {
        conv = 6_000;
        results = 4_000;
        compacted = true;
      }
      points.push({ conv, results, compacted });
    }
    return points;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const now = history[turn - 1];
  const totalAt = (p: (typeof history)[number]) => fixed.system + fixed.tools + fixed.memory + p.conv + p.results;
  const compactions = history.slice(0, turn).filter((p) => p.compacted).length;

  const W = 640;
  const H = 120;
  const path = history
    .map((p, i) => `${i ? "L" : "M"}${(i / 59) * W} ${H - (totalAt(p) / capacity) * H}`)
    .join(" ");

  return (
    <Demo title="A coding agent's context window, turn by turn" tag="Model" foot="Illustrative sizes for a 200K-token window. Tool results (file reads, test output) are usually the biggest and fastest-growing part.">
      <label className="field">
        <span>
          Turn <b className="tabular">{turn}</b> of a long task
          {compactions ? ` · compacted ${compactions} time${compactions === 1 ? "" : "s"} so far` : ""}
        </span>
        <input id="budget-turn" type="range" min={1} max={60} value={turn} onChange={(e) => setTurn(Number(e.target.value))} />
      </label>
      <ContextMeter
        capacity={capacity}
        segments={[
          { label: "system prompt", tokens: fixed.system, color: "var(--p2)" },
          { label: "tool definitions", tokens: fixed.tools, color: "var(--p1)" },
          { label: "AGENTS.md", tokens: fixed.memory, color: "var(--warn)" },
          { label: "conversation", tokens: now.conv, color: "var(--faint)" },
          { label: "tool results", tokens: now.results, color: "var(--p3)" },
        ]}
      />
      <div className="diagram" style={{ padding: "8px 8px 0" }}>
        <svg viewBox={`-40 -10 ${W + 60} ${H + 36}`} role="img" aria-label="Context used over 60 turns">
          {[0, 0.5, 0.8, 1].map((f) => (
            <g key={f}>
              <line x1={0} x2={W} y1={H - f * H} y2={H - f * H} className="d-line" style={{ opacity: f === 0.8 ? 0.8 : 0.25 }} strokeDasharray={f === 0.8 ? "4 4" : undefined} />
              <text x={-6} y={H - f * H + 4} textAnchor="end" className="d-sub">
                {Math.round(f * 200)}K
              </text>
            </g>
          ))}
          <path d={path} className="d-line p3" strokeWidth={2.5} />
          <circle cx={((turn - 1) / 59) * W} cy={H - (totalAt(now) / capacity) * H} r={5} className="d-p3" />
          <text x={W} y={H + 22} textAnchor="end" className="d-sub">
            turn 60
          </text>
          <text x={0} y={H + 22} className="d-sub">
            turn 1
          </text>
          <text x={W - 4} y={H - 0.8 * H - 6} textAnchor="end" className="d-label">
            COMPACT AT 80%
          </text>
        </svg>
      </div>
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// RAG
// ---------------------------------------------------------------------------

const DOCS = [
  { id: "prices", title: "Checkout: money", text: "Prices come from the API in cents. Convert with toDollars() and format with formatPrice(). Never use floats for totals on the server.", tags: ["price", "money", "checkout", "total", "cart", "cents", "format", "show"] },
  { id: "button", title: "Design system: Button", text: 'Use <Button variant="primary"> for the main action on a page and variant="secondary" for everything else. Only one primary button per view.', tags: ["button", "action", "primary", "design", "component", "main"] },
  { id: "flags", title: "Feature flags", text: "Wrap unfinished UI in useFlag('flag-name'). Flags are managed in LaunchPad and default to off in production.", tags: ["flag", "feature", "unfinished", "hide", "release", "toggle"] },
  { id: "testing", title: "Testing", text: "Run pnpm test. Use React Testing Library and query by role, not by test id. Every bug fix needs a regression test.", tags: ["test", "testing", "bug", "fix", "jest", "library"] },
  { id: "analytics", title: "Analytics", text: "Track events with track('event_name', props). Event names are snake_case and must be added to events.yaml.", tags: ["analytics", "track", "event", "metric"] },
];

const RAG_QUESTIONS = [
  {
    q: "How should I show prices in the checkout?",
    without: "Use Intl.NumberFormat with the user's locale, e.g. new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price).",
    with: "Prices arrive from the API in cents, so convert them with toDollars() first, then display them with formatPrice(). (From: Checkout: money)",
  },
  {
    q: "Which button do I use for the main action?",
    without: "Use a <button type=\"submit\"> styled with your primary brand colour, and make sure it has a clear label.",
    with: 'Use <Button variant="primary">, and only one per view. Everything else uses variant="secondary". (From: Design system: Button)',
  },
  {
    q: "How do we hide a feature that isn't finished?",
    without: "You could use an environment variable like REACT_APP_SHOW_FEATURE and check it before rendering.",
    with: "Wrap it in useFlag('flag-name'). Flags live in LaunchPad and are off in production by default. (From: Feature flags)",
  },
];

function score(question: string, tags: string[]): number {
  const words = question.toLowerCase().match(/[a-z]+/g) ?? [];
  const hits = tags.filter((t) => words.some((w) => w.startsWith(t) || t.startsWith(w.slice(0, 5)))).length;
  return Math.min(0.97, 0.12 + hits * 0.24);
}

export function RagDemo() {
  const [qi, setQi] = useState(0);
  const [stage, setStage] = useState(0);
  const question = RAG_QUESTIONS[qi];
  const ranked = DOCS.map((d) => ({ d, s: score(question.q, d.tags) })).sort((a, b) => b.s - a.s);
  const top = ranked.slice(0, 2);
  const prompt = `Answer using only these docs.\n\n${top.map(({ d }) => `## ${d.title}\n${d.text}`).join("\n\n")}\n\nQuestion: ${question.q}`;
  const stages = ["Ask", "Retrieve", "Build the prompt", "Answer"];

  return (
    <Demo
      title="Retrieval-augmented generation"
      foot="Scores are a simplified stand-in for embedding similarity. The flow is exactly what real RAG systems do."
    >
      <div className="row">
        {RAG_QUESTIONS.map((x, i) => (
          <button key={x.q} className="chip" aria-pressed={i === qi} onClick={() => (setQi(i), setStage(0))}>
            {x.q}
          </button>
        ))}
      </div>
      <div className="row">
        {stages.map((label, i) => (
          <button key={label} className="btn small" aria-pressed={stage === i} onClick={() => setStage(i)}>
            {i + 1}. {label}
          </button>
        ))}
      </div>
      {stage === 0 && (
        <div className="split">
          <div className="pane">
            <span className="pane-title">Without retrieval</span>
            <div className="chat">
              <div className="bubble user">{question.q}</div>
              <div className="bubble assistant">{question.without}</div>
            </div>
            <p className="small" style={{ color: "var(--bad)" }}>
              A reasonable answer, but not how <em>your</em> team does it.
            </p>
          </div>
          <div className="pane">
            <span className="pane-title">Your team's docs (5 chunks)</span>
            {DOCS.map((d) => (
              <div key={d.id} className="small">
                <b>{d.title}</b> <span className="muted">{d.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {stage === 1 && (
        <div className="bars part-2">
          {ranked.map(({ d, s }, i) => (
            <div key={d.id} className={`bar ${i < 2 ? "picked" : "excluded"}`}>
              <span className="label">{d.title}</span>
              <span className="track">
                <span className="fill" style={{ width: `${s * 100}%` }} />
              </span>
              <span className="pct">{s.toFixed(2)}</span>
            </div>
          ))}
          <p className="small muted">Similarity between the question and each chunk. The top 2 go into the prompt.</p>
        </div>
      )}
      {stage === 2 && <CodeBlock lang="md" code={prompt} title="The prompt the model actually gets" />}
      {stage === 3 && (
        <div className="chat">
          <div className="bubble user">{question.q}</div>
          <div className="bubble assistant">{question.with}</div>
        </div>
      )}
      <div className="row">
        <button className="btn primary" onClick={() => setStage((s) => Math.min(3, s + 1))} disabled={stage === 3}>
          Next step
        </button>
      </div>
    </Demo>
  );
}
