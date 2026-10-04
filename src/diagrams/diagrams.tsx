// Inline SVG diagrams. Every colour comes from theme tokens via CSS classes.

import type { ReactNode } from "react";
import { ArrowDefs, Figure } from "../components/ui.tsx";

function Box({
  x,
  y,
  w,
  h,
  title,
  sub,
  cls = "d-box",
  rx = 10,
  mono,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: ReactNode;
  sub?: ReactNode;
  cls?: string;
  rx?: number;
  mono?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} className={cls} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 4 : h / 2 + 5)} textAnchor="middle" className={mono ? "d-mono" : "d-title"}>
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 15} textAnchor="middle" className="d-sub">
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({ d, id, cls = "", label, lx, ly }: { d: string; id: string; cls?: string; label?: string; lx?: number; ly?: number }) {
  return (
    <g>
      <path d={d} className={`d-line ${cls}`} markerEnd={`url(#${id})`} />
      {label && lx !== undefined && ly !== undefined && (
        <text x={lx} y={ly} textAnchor="middle" className="d-label">
          {label}
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------

export function ModelPipeline() {
  const id = "a-pipeline";
  return (
    <Figure caption="One forward pass produces one token. Generating a 500-token answer runs this 500 times.">
      <svg viewBox="0 0 980 250" role="img" aria-label="How an LLM turns text into the next token">
        <ArrowDefs id={id} />
        <Box x={10} y={70} w={130} h={64} title="Your text" sub={'"const [count, set"'} cls="d-box-2" />
        <Box x={180} y={70} w={120} h={64} title="Tokenizer" sub="text → IDs" cls="d-p1" />
        <Box x={340} y={70} w={130} h={64} title="Embeddings" sub="IDs → vectors" cls="d-p1" />
        <rect x={510} y={44} width={170} height={116} rx={12} className="d-p1" />
        <text x={595} y={74} textAnchor="middle" className="d-title">
          Transformer
        </text>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={530} y={88 + i * 20} width={130} height={14} rx={4} className="d-box" />
        ))}
        <text x={595} y={175} textAnchor="middle" className="d-sub">
          dozens of attention layers
        </text>
        <Box x={720} y={70} w={130} h={64} title="Probabilities" sub="one per vocab token" cls="d-p1" />
        <Box x={880} y={70} w={90} h={64} title="Sample" sub='"Count"' cls="d-p3" />
        <Arrow id={id} d="M140 102 H176" />
        <Arrow id={id} d="M300 102 H336" />
        <Arrow id={id} d="M470 102 H506" />
        <Arrow id={id} d="M680 102 H716" />
        <Arrow id={id} d="M850 102 H876" />
        <path d="M925 134 V215 H75 V138" className="d-line p3 dash" markerEnd={`url(#${id})`} />
        <text x={500} y={232} textAnchor="middle" className="d-label">
          APPEND THE NEW TOKEN AND RUN AGAIN
        </text>
        <text x={240} y={40} textAnchor="middle" className="d-sub">
          [1385, 510, 1868, 11, 738]
        </text>
        <text x={785} y={40} textAnchor="middle" className="d-sub">
          Count 61% · Value 12% · …
        </text>
      </svg>
    </Figure>
  );
}

export function TrainingPipeline() {
  const id = "a-train";
  return (
    <Figure caption="Training happens once, before you ever call the model. Your API calls never change the weights.">
      <svg viewBox="0 0 980 230" role="img" aria-label="From internet text to a chat model">
        <ArrowDefs id={id} />
        <Box x={10} y={60} w={150} h={70} title="Text and code" sub="trillions of tokens" cls="d-box-2" />
        <Box x={200} y={60} w={150} h={70} title="Pretraining" sub="predict the next token" cls="d-p1" />
        <Box x={390} y={60} w={130} h={70} title="Base model" sub="continues text" cls="d-box" />
        <Box x={560} y={60} w={150} h={70} title="Fine-tuning" sub="example conversations" cls="d-p2" />
        <Box x={750} y={60} w={110} h={70} title="RL" sub="feedback, tests" cls="d-p2" />
        <Box x={890} y={60} w={80} h={70} title="Chat" sub="model" cls="d-p3" />
        <Arrow id={id} d="M160 95 H196" />
        <Arrow id={id} d="M350 95 H386" />
        <Arrow id={id} d="M520 95 H556" />
        <Arrow id={id} d="M710 95 H746" />
        <Arrow id={id} d="M860 95 H886" />
        <text x={275} y={160} textAnchor="middle" className="d-sub">
          weeks · thousands of GPUs
        </text>
        <text x={275} y={178} textAnchor="middle" className="d-sub">
          knowledge stops at the cutoff
        </text>
        <text x={710} y={160} textAnchor="middle" className="d-sub">
          teaches it to answer, follow
        </text>
        <text x={710} y={178} textAnchor="middle" className="d-sub">
          instructions, use tools, be safe
        </text>
        <text x={930} y={160} textAnchor="middle" className="d-sub">
          what the
        </text>
        <text x={930} y={178} textAnchor="middle" className="d-sub">
          API serves
        </text>
        <text x={10} y={30} className="d-label">
          TRAINING (ONCE)
        </text>
      </svg>
    </Figure>
  );
}

export function MemoryLayers() {
  return (
    <Figure caption="When anything AI “remembers”, it's one of these three. Only the bottom one is the model itself.">
      <svg viewBox="0 0 900 300" role="img" aria-label="Three kinds of memory">
        <rect x={10} y={10} width={880} height={84} rx={12} className="d-p3" />
        <text x={30} y={42} className="d-title">
          Long-term: storage outside the model
        </text>
        <text x={30} y={64} className="d-sub">
          Files (AGENTS.md), databases, memory tools, chat history. Your code loads the relevant parts into the context.
        </text>
        <text x={30} y={82} className="d-sub">
          Survives forever · you control it · costs tokens only when loaded
        </text>
        <rect x={10} y={106} width={880} height={84} rx={12} className="d-p2" />
        <text x={30} y={138} className="d-title">
          Short-term: the context window
        </text>
        <text x={30} y={160} className="d-sub">
          Everything sent in this one request: system prompt, messages, tool results. The model's only working memory.
        </text>
        <text x={30} y={178} className="d-sub">
          Gone after the request · limited by tokens · re-sent every turn
        </text>
        <rect x={10} y={202} width={880} height={84} rx={12} className="d-p1" />
        <text x={30} y={234} className="d-title">
          Built-in: the weights
        </text>
        <text x={30} y={256} className="d-sub">
          What the model learned in training: language, facts, common code. Frozen at the knowledge cutoff.
        </text>
        <text x={30} y={274} className="d-sub">
          Can't be changed by chatting · doesn't include your codebase
        </text>
      </svg>
    </Figure>
  );
}

export function StatelessSequence() {
  const rows = [
    ["Hi, I'm Asha"],
    ["Hi, I'm Asha", "Nice to meet you!", "What's my name?"],
    ["Hi, I'm Asha", "Nice to meet you!", "What's my name?", "You're Asha.", "Fix the cart bug"],
  ];
  return (
    <Figure caption="Every request carries the whole conversation. The model sees each one fresh.">
      <svg viewBox="0 0 900 260" role="img" aria-label="Each request re-sends the history">
        {rows.map((msgs, r) => (
          <g key={r}>
            <text x={10} y={50 + r * 80} className="d-label">
              REQUEST {r + 1}
            </text>
            {msgs.map((m, i) => (
              <g key={i}>
                <rect
                  x={110 + i * 156}
                  y={28 + r * 80}
                  width={148}
                  height={36}
                  rx={8}
                  className={i % 2 === 0 ? "d-box-2" : "d-p2"}
                  opacity={i < msgs.length - (r === 0 ? 1 : 1) ? 0.75 : 1}
                />
                <text x={110 + i * 156 + 74} y={51 + r * 80} textAnchor="middle" className="d-text" style={{ fontSize: 12.5 }}>
                  {m}
                </text>
              </g>
            ))}
            <text x={890} y={51 + r * 80} textAnchor="end" className="d-sub">
              ≈ {[6, 22, 38][r]} tokens
            </text>
          </g>
        ))}
      </svg>
    </Figure>
  );
}

export function RagPipeline() {
  const id = "a-rag";
  return (
    <Figure caption="RAG is two steps: search, then answer with the search results in the prompt.">
      <svg viewBox="0 0 980 260" role="img" aria-label="Retrieval-augmented generation">
        <ArrowDefs id={id} />
        <text x={10} y={24} className="d-label">
          AHEAD OF TIME
        </text>
        <Box x={10} y={36} w={130} h={56} title="Your docs" cls="d-box-2" />
        <Box x={180} y={36} w={120} h={56} title="Chunk" sub="split into sections" cls="d-p2" />
        <Box x={340} y={36} w={120} h={56} title="Embed" sub="text → vectors" cls="d-p2" />
        <Box x={500} y={36} w={150} h={56} title="Vector index" sub="stored vectors" cls="d-p2" />
        <Arrow id={id} d="M140 64 H176" />
        <Arrow id={id} d="M300 64 H336" />
        <Arrow id={id} d="M460 64 H496" />
        <text x={10} y={140} className="d-label">
          FOR EACH QUESTION
        </text>
        <Box x={10} y={152} w={130} h={56} title="Question" cls="d-box-2" />
        <Box x={180} y={152} w={120} h={56} title="Embed" cls="d-p2" />
        <Box x={340} y={152} w={150} h={56} title="Find closest" sub="top 3 chunks" cls="d-p2" />
        <Box x={530} y={152} w={170} h={56} title="Prompt" sub="question + chunks" cls="d-p3" />
        <Box x={740} y={152} w={100} h={56} title="LLM" cls="d-p1" />
        <Box x={880} y={152} w={90} h={56} title="Answer" cls="d-good" />
        <Arrow id={id} d="M140 180 H176" />
        <Arrow id={id} d="M300 180 H336" />
        <Arrow id={id} d="M575 92 V120 H415 V148" cls="dash" />
        <Arrow id={id} d="M490 180 H526" />
        <Arrow id={id} d="M700 180 H736" />
        <Arrow id={id} d="M840 180 H876" />
      </svg>
    </Figure>
  );
}

export function RLLoop() {
  const id = "a-rl";
  return (
    <Figure compact caption="Reinforcement learning with verifiable rewards: tests are an automatic, honest grader.">
      <svg viewBox="0 0 700 260" role="img" aria-label="Training on tasks checked by tests">
        <ArrowDefs id={id} />
        <Box x={20} y={100} w={140} h={60} title="Coding task" sub="issue + repo" cls="d-box-2" />
        <Box x={220} y={30} w={160} h={60} title="Model attempts" sub="edits, runs tools" cls="d-p1" />
        <Box x={440} y={100} w={160} h={60} title="Run the tests" sub="pass or fail" cls="d-good" />
        <Box x={220} y={170} w={160} h={60} title="Update weights" sub="reward what passed" cls="d-p3" />
        <Arrow id={id} d="M160 120 C190 120 190 60 216 60" />
        <Arrow id={id} d="M380 60 C420 60 420 120 436 120" />
        <Arrow id={id} d="M520 160 C520 200 420 200 384 200" />
        <Arrow id={id} d="M220 200 C150 200 110 200 90 164" cls="dash" />
        <text x={640} y={135} className="d-sub" textAnchor="middle">
          millions
        </text>
        <text x={640} y={152} className="d-sub" textAnchor="middle">
          of times
        </text>
      </svg>
    </Figure>
  );
}

export function ToolSequence() {
  const id = "a-tools";
  const lanes = [
    { x: 90, title: "You" },
    { x: 330, title: "Your code (harness)" },
    { x: 590, title: "Model API" },
    { x: 840, title: "File system" },
  ];
  const steps: Array<[number, number, number, string, string?]> = [
    [0, 1, 70, "“Why is the cart total wrong?”"],
    [1, 2, 115, "messages + tool definitions"],
    [2, 1, 160, "tool_use: read_file(cart.ts)", "p3"],
    [1, 3, 205, "readFile('cart.ts')"],
    [3, 1, 250, "file contents"],
    [1, 2, 295, "tool_result: file contents"],
    [2, 1, 340, "text: “The reducer ignores qty…”", "p1"],
    [1, 0, 385, "show the answer"],
  ];
  return (
    <Figure caption="The model only ever sends and receives text. Your code is the only thing that touches files.">
      <svg viewBox="0 0 960 420" role="img" aria-label="Sequence of a tool call">
        <ArrowDefs id={id} />
        {lanes.map((l) => (
          <g key={l.title}>
            <rect x={l.x - 90} y={8} width={180} height={34} rx={8} className={l.title === "Model API" ? "d-p1" : "d-box-2"} />
            <text x={l.x} y={30} textAnchor="middle" className="d-title" style={{ fontSize: 13.5 }}>
              {l.title}
            </text>
            <line x1={l.x} y1={42} x2={l.x} y2={410} className="d-line dash" />
          </g>
        ))}
        {steps.map(([from, to, y, label, cls], i) => {
          const x1 = lanes[from].x;
          const x2 = lanes[to].x;
          const dir = x2 > x1 ? -6 : 6;
          return (
            <g key={i}>
              <path d={`M${x1} ${y} H${x2 + dir}`} className={`d-line ${cls ?? ""}`} markerEnd={`url(#${id})`} />
              <text x={(x1 + x2) / 2} y={y - 7} textAnchor="middle" className="d-mono" style={{ fontSize: 11.5 }}>
                {i + 1}. {label}
              </text>
            </g>
          );
        })}
      </svg>
    </Figure>
  );
}

export function AgentLoopDiagram() {
  const id = "a-loop";
  return (
    <Figure compact caption="The whole agent: one loop. The model decides each next step; your code keeps it going.">
      <svg viewBox="0 0 760 330" role="img" aria-label="The agent loop">
        <ArrowDefs id={id} />
        <Box x={40} y={30} w={200} h={64} title="Call the model" sub="messages + tools" cls="d-p1" />
        <rect x={290} y={30} width={180} height={64} rx={32} className="d-warn" />
        <text x={380} y={58} textAnchor="middle" className="d-title" style={{ fontSize: 14 }}>
          stop_reason?
        </text>
        <text x={380} y={78} textAnchor="middle" className="d-sub">
          the model decides
        </text>
        <Box x={560} y={30} w={180} h={64} title="Done" sub="show the final answer" cls="d-good" />
        <Box x={290} y={200} w={180} h={64} title="Run the tools" sub="your code, your rules" cls="d-p3" />
        <Box x={40} y={200} w={200} h={64} title="Append results" sub="tool_result messages" cls="d-box-2" />
        <Arrow id={id} d="M240 62 H286" />
        <Arrow id={id} d="M470 62 H556" label="end_turn" lx={514} ly={50} />
        <Arrow id={id} d="M380 94 V196" label="tool_use" lx={420} ly={150} />
        <Arrow id={id} d="M290 232 H244" />
        <Arrow id={id} d="M140 200 V98" />
        <text x={380} y={310} textAnchor="middle" className="d-sub">
          Repeat until the model stops asking for tools (or a guardrail stops it).
        </text>
      </svg>
    </Figure>
  );
}

export function FeedbackLoop() {
  const id = "a-feedback";
  return (
    <Figure compact caption="Tests turn “looks right” into “is right”. The agent sees failures and tries again.">
      <svg viewBox="0 0 760 250" role="img" aria-label="Edit, test, read failures, repeat">
        <ArrowDefs id={id} />
        <Box x={30} y={90} w={150} h={60} title="Run tests" sub="reproduce: red" cls="d-warn" />
        <Box x={230} y={20} w={150} h={60} title="Locate" sub="search, read" cls="d-p1" />
        <Box x={430} y={90} w={150} h={60} title="Edit" sub="one small change" cls="d-p3" />
        <Box x={230} y={165} w={150} h={60} title="Run tests" sub="verify" cls="d-warn" />
        <Box x={620} y={165} w={120} h={60} title="Green" sub="report back" cls="d-good" />
        <Arrow id={id} d="M180 110 C205 110 205 50 226 50" />
        <Arrow id={id} d="M380 50 C410 50 410 110 426 110" />
        <Arrow id={id} d="M505 150 C505 195 420 195 384 195" />
        <Arrow id={id} d="M230 195 C150 195 105 195 105 154" cls="dash" label="still red" lx={150} ly={215} />
        <Arrow id={id} d="M380 205 H616" cls="good" label="all pass" lx={500} ly={225} />
      </svg>
    </Figure>
  );
}

export function AgentAnatomy() {
  const harness = [
    ["Tools", "read, search, edit, bash, web"],
    ["Context management", "compaction, budgets"],
    ["Project memory", "AGENTS.md / CLAUDE.md"],
    ["Permissions + sandbox", "ask, allow, block"],
    ["MCP", "plug in more tools"],
    ["Subagents", "loops that call loops"],
  ];
  return (
    <Figure caption="What's inside any coding agent. Our companion code has a small version of every layer.">
      <svg viewBox="0 0 960 400" role="img" aria-label="Anatomy of a coding agent">
        <rect x={10} y={10} width={940} height={380} rx={16} className="d-box-2" />
        <text x={30} y={40} className="d-label">
          PRODUCT · terminal, IDE, web, Slack, GitHub
        </text>
        <rect x={30} y={56} width={900} height={314} rx={14} className="d-p3" />
        <text x={50} y={84} className="d-label">
          HARNESS · steps 4–7
        </text>
        {harness.map(([title, sub], i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = col === 0 ? 50 : 700;
          const y = 100 + row * 86;
          return (
            <g key={title}>
              <rect x={x} y={y} width={210} height={70} rx={10} className="d-box" />
              <text x={x + 14} y={y + 30} className="d-title" style={{ fontSize: 14 }}>
                {title}
              </text>
              <text x={x + 14} y={y + 52} className="d-sub">
                {sub}
              </text>
            </g>
          );
        })}
        <rect x={290} y={100} width={380} height={242} rx={14} className="d-p2" />
        <text x={310} y={128} className="d-label">
          AGENT LOOP · step 5
        </text>
        <text x={480} y={152} textAnchor="middle" className="d-mono">
          while (stop_reason === "tool_use")
        </text>
        <rect x={360} y={176} width={240} height={130} rx={14} className="d-p1" />
        <text x={480} y={226} textAnchor="middle" className="d-title" style={{ fontSize: 20 }}>
          LLM
        </text>
        <text x={480} y={250} textAnchor="middle" className="d-sub">
          predicts the next token
        </text>
        <text x={480} y={270} textAnchor="middle" className="d-sub">
          steps 0–1
        </text>
      </svg>
    </Figure>
  );
}

export function McpDiagram() {
  const servers = [
    ["GitHub", "issues, PRs"],
    ["Figma", "designs, tokens"],
    ["Database", "query data"],
    ["Browser", "click, screenshot"],
    ["Jira / Linear", "tickets"],
    ["Your design system", "components, docs"],
  ];
  return (
    <Figure caption="MCP is a standard plug. Any MCP server's tools show up in the agent's tool list.">
      <svg viewBox="0 0 900 330" role="img" aria-label="MCP servers connected to an agent">
        <rect x={30} y={110} width={230} height={110} rx={14} className="d-p3" />
        <text x={145} y={156} textAnchor="middle" className="d-title">
          Coding agent
        </text>
        <text x={145} y={178} textAnchor="middle" className="d-sub">
          MCP client
        </text>
        {servers.map(([name, sub], i) => {
          const y = 14 + i * 52;
          return (
            <g key={name}>
              <path d={`M260 165 C 420 165 420 ${y + 21} 560 ${y + 21}`} className="d-line p2" />
              <rect x={560} y={y} width={300} height={42} rx={8} className="d-p2" />
              <text x={578} y={y + 26} className="d-title" style={{ fontSize: 13.5 }}>
                {name}
              </text>
              <text x={846} y={y + 26} textAnchor="end" className="d-sub">
                {sub}
              </text>
            </g>
          );
        })}
        <text x={410} y={318} textAnchor="middle" className="d-mono">
          tools/list → tools/call → result
        </text>
      </svg>
    </Figure>
  );
}

export function SubagentsDiagram() {
  return (
    <Figure caption="A subagent burns its own context on the search, then hands back a few lines. The main context stays clean.">
      <svg viewBox="0 0 900 290" role="img" aria-label="A main agent delegating to subagents">
        <rect x={20} y={20} width={300} height={250} rx={14} className="d-p3" />
        <text x={40} y={50} className="d-title">
          Main agent
        </text>
        <text x={40} y={72} className="d-sub">
          context: task, plan, summaries
        </text>
        <rect x={40} y={92} width={260} height={16} rx={4} className="d-box" />
        <rect x={40} y={92} width={78} height={16} rx={4} className="d-p3" />
        <text x={40} y={128} className="d-sub">
          30% used
        </text>
        {[0, 1].map((i) => {
          const y = 30 + i * 130;
          return (
            <g key={i}>
              <path d={`M320 ${150 + (i ? 40 : -40)} H520`} className="d-line p2" />
              <text x={420} y={140 + (i ? 70 : -50)} textAnchor="middle" className="d-label">
                {i ? "← “3 call sites, see list”" : "“find every use of cartTotal” →"}
              </text>
              <rect x={520} y={y} width={360} height={110} rx={12} className="d-p2" />
              <text x={540} y={y + 30} className="d-title" style={{ fontSize: 14 }}>
                Subagent {i + 1}
              </text>
              <text x={540} y={y + 52} className="d-sub">
                {i ? "fresh context: reads 40 test files" : "fresh context: greps and reads 25 files"}
              </text>
              <rect x={540} y={y + 66} width={320} height={16} rx={4} className="d-box" />
              <rect x={540} y={y + 66} width={270} height={16} rx={4} className="d-p2" />
            </g>
          );
        })}
      </svg>
    </Figure>
  );
}

export function CachingDiagram() {
  // Illustrative token counts per turn of an agent run (thousands).
  const turns = [8, 11, 15, 18, 23, 27, 31];
  const max = 32;
  const w = 80;
  const chartH = 200;
  return (
    <Figure caption="Each turn re-sends everything before it. With prompt caching, the repeated prefix (blue) is cheaper and faster; only the new part (orange) is processed in full.">
      <svg viewBox="0 0 760 280" role="img" aria-label="Cached versus new tokens per turn">
        {[0, 8, 16, 24, 32].map((v) => {
          const y = 230 - (v / max) * chartH;
          return (
            <g key={v}>
              <line x1={60} x2={740} y1={y} y2={y} className="d-line" style={{ opacity: 0.25 }} />
              <text x={50} y={y + 4} textAnchor="end" className="d-sub">
                {v}k
              </text>
            </g>
          );
        })}
        {turns.map((total, i) => {
          const cached = i === 0 ? 0 : turns[i - 1];
          const x = 80 + i * (w + 14);
          const hTotal = (total / max) * chartH;
          const hCached = (cached / max) * chartH;
          return (
            <g key={i}>
              <rect x={x} y={230 - hTotal} width={w} height={hTotal - hCached} className="d-p3" rx={3} />
              {cached > 0 && <rect x={x} y={230 - hCached} width={w} height={hCached} className="d-p1" rx={3} />}
              <text x={x + w / 2} y={250} textAnchor="middle" className="d-sub">
                turn {i + 1}
              </text>
            </g>
          );
        })}
        <text x={60} y={20} className="d-label">
          INPUT TOKENS SENT PER TURN
        </text>
      </svg>
    </Figure>
  );
}

export function TextToAction() {
  const id = "a-t2a";
  return (
    <Figure compact caption="How text becomes action: the model writes structured text, ordinary code parses it and does the work.">
      <svg viewBox="0 0 760 170" role="img" aria-label="Model output parsed by code into an action">
        <ArrowDefs id={id} />
        <Box x={10} y={50} w={150} h={70} title="Model" sub="writes text" cls="d-p1" />
        <rect x={200} y={40} width={250} height={90} rx={10} className="d-box-2" />
        <text x={215} y={70} className="d-mono">{`{ "type": "tool_use",`}</text>
        <text x={215} y={90} className="d-mono">{`  "name": "read_file",`}</text>
        <text x={215} y={110} className="d-mono">{`  "input": {"path": "cart.ts"} }`}</text>
        <Box x={490} y={50} w={120} h={70} title="Your code" sub="JSON.parse" cls="d-p3" />
        <Box x={650} y={50} w={100} h={70} title="Action" sub="fs.readFile" cls="d-good" />
        <Arrow id={id} d="M160 85 H196" />
        <Arrow id={id} d="M450 85 H486" />
        <Arrow id={id} d="M610 85 H646" />
      </svg>
    </Figure>
  );
}
