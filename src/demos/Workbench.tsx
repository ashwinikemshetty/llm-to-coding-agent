import { useEffect, useMemo, useRef, useState } from "react";
import {
  approve,
  buildRequest,
  contextBreakdown,
  INITIAL_FILES,
  MODES,
  start,
  step,
  type ModeId,
  type RunState,
  type WbEvent,
} from "../lib/browser-agent.ts";
import { CodeBlock } from "../components/ui.tsx";
import { RichText } from "../components/RichText.tsx";
import { ContextMeter } from "../components/ContextMeter.tsx";
import { href } from "../lib/router.ts";

const TOY_WINDOW = 2000;

function EventRow({ event }: { event: WbEvent }) {
  switch (event.kind) {
    case "user":
      return (
        <div className="event user">
          <span className="kind">you</span>
          <span className="body">
            <RichText text={event.text} />
          </span>
        </div>
      );
    case "text":
      return (
        <div className="event text">
          <span className="kind">model · turn {event.turn}</span>
          <span className="body">
            <RichText text={event.text} />
          </span>
        </div>
      );
    case "tool_use":
      return (
        <div className="event tool_use">
          <span className="kind">tool_use</span>
          <span className="body mono-body">
            {event.block.name}({JSON.stringify(event.block.input, null, 1).replace(/\n\s*/g, " ")})
          </span>
        </div>
      );
    case "tool_result":
      return (
        <div className={`event tool_result ${event.block.is_error ? "error" : ""}`}>
          <span className="kind">tool_result</span>
          <span className="body mono-body">{event.block.content}</span>
        </div>
      );
    case "system":
      return (
        <div className="event system">
          <span className="kind">harness</span>
          <span className="body muted">{event.text}</span>
        </div>
      );
  }
}

function changedLines(before: string, after: string): number[] {
  const a = before.split("\n");
  return after.split("\n").flatMap((line, i) => (line !== a[i] ? [i + 1] : []));
}

function Terminal({ tests }: { tests?: RunState["tests"] }) {
  if (!tests) return <div className="terminal dim">$ node --test cart.test.ts{"\n"}(not run yet)</div>;
  return (
    <div className="terminal">
      <span className="dim">$ node --test cart.test.ts{"\n"}</span>
      {tests.output.split("\n").map((line, i) => (
        <span key={i} className={line.startsWith("✔") ? "pass" : line.startsWith("✖") ? "fail" : "dim"}>
          {line}
          {"\n"}
        </span>
      ))}
    </div>
  );
}

export function Workbench({
  initialMode = "coding",
  modes,
  standalone = false,
}: {
  /** True on the workbench page itself. */
  standalone?: boolean;
  initialMode?: ModeId;
  /** Restrict which modes are offered. Defaults to all. */
  modes?: ModeId[];
}) {
  const offered = MODES.filter((m) => !modes || modes.includes(m.id));
  const [state, setState] = useState<RunState>(() => start(MODES.find((m) => m.id === initialMode) ?? MODES[0]));
  const [file, setFile] = useState("cart.ts");
  const [view, setView] = useState<"request" | "response">("request");
  const [playing, setPlaying] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [state.events.length]);

  useEffect(() => {
    if (!playing) return;
    if (state.phase === "done") {
      setPlaying(false);
      return;
    }
    // Keep "playing" while waiting for approval, so the run continues once you answer.
    if (state.phase === "await-approval") return;
    const timer = window.setTimeout(() => setState((s) => step(s)), 700);
    return () => window.clearTimeout(timer);
  }, [playing, state]);

  const reset = (modeId = state.mode.id) => {
    setPlaying(false);
    setState(start(MODES.find((m) => m.id === modeId)!));
    setFile("cart.ts");
  };

  // What the next request looks like (or the last one, once finished).
  const request = useMemo(
    () => (state.phase === "done" && state.lastRequest ? state.lastRequest : buildRequest(state)),
    [state],
  );
  const breakdown = contextBreakdown(request);

  const stepLabel =
    state.phase === "call-model"
      ? `Call the model (turn ${state.turn + 1})`
      : state.phase === "run-tools"
        ? "Run the requested tools"
        : state.phase === "await-approval"
          ? "Waiting for your approval"
          : "Done";

  const testsPill = !state.tests ? (
    <span className="status-pill grey">tests not run</span>
  ) : state.tests.failed ? (
    <span className="status-pill red">✖ {state.tests.failed} failing</span>
  ) : (
    <span className="status-pill green">✔ all {state.tests.passed} passing</span>
  );

  return (
    <section className="demo wb part-3" aria-label="Agent workbench">
      <div className="demo-head">
        <span className="tag">Live demo</span>
        <span className="title">Agent workbench</span>
        <span className="spacer" />
        {!standalone && (
          <a className="btn small ghost" href={href.workbench}>
            Open full screen
          </a>
        )}
      </div>

      {offered.length > 1 && (
        <div className="wb-controls">
          <div className="wb-modes" role="group" aria-label="What the agent can do">
            {offered.map((m) => (
              <button key={m.id} className="wb-mode" aria-pressed={m.id === state.mode.id} onClick={() => reset(m.id)}>
                <b>{m.label}</b>
                <span>{m.short}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="wb-controls">
        <button
          className="btn primary"
          onClick={() => setState((s) => step(s))}
          disabled={playing || state.phase === "done" || state.phase === "await-approval"}
        >
          {stepLabel}
        </button>
        <button
          className="btn"
          onClick={() => setPlaying(true)}
          disabled={playing || state.phase === "done" || state.phase === "await-approval"}
        >
          ▶ Run to the end
        </button>
        <button className="btn ghost" onClick={() => reset()}>
          Reset
        </button>
        <span className="spacer" style={{ flex: 1 }} />
        <span className="small muted tabular">
          {state.turn} model call{state.turn === 1 ? "" : "s"} · {(state.usage.input + state.usage.output).toLocaleString()} tokens billed
        </span>
      </div>

      <div className="wb-grid">
        <div className="wb-col files">
          <div className="wb-col-head">
            <span>Project</span>
            {testsPill}
          </div>
          <div className="wb-col-body">
            <div className="file-tabs" role="group" aria-label="Files">
              {Object.keys(state.files).map((path) => (
                <button
                  key={path}
                  aria-pressed={path === file}
                  className={state.changed.includes(path) ? "changed" : ""}
                  onClick={() => setFile(path)}
                >
                  {path}
                </button>
              ))}
            </div>
            <CodeBlock
              code={state.files[file]}
              lang={file.endsWith(".md") ? "md" : "ts"}
              highlightLines={changedLines(INITIAL_FILES[file], state.files[file])}
              className="short"
            />
            <Terminal tests={state.tests} />
          </div>
        </div>

        <div className="wb-col">
          <div className="wb-col-head">
            <span>Transcript</span>
            <span className="tabular">{state.events.length} events</span>
          </div>
          <div className="wb-col-body" ref={transcriptRef}>
            {state.events.map((event, i) => (
              <EventRow key={i} event={event} />
            ))}
            {state.phase === "await-approval" && state.pending && (
              <div className="approval" role="alertdialog" aria-label="Permission request">
                <b>The agent wants to run {state.pending.name}</b>
                <code style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(state.pending.input)}</code>
                <div className="row">
                  <button className="btn primary small" onClick={() => setState((s) => approve(s, "allow"))}>
                    Allow once
                  </button>
                  <button className="btn small" onClick={() => setState((s) => approve(s, "always"))}>
                    Always allow {state.pending.name}
                  </button>
                  <button className="btn small" onClick={() => setState((s) => approve(s, "deny"))}>
                    Deny
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="wb-col">
          <div className="wb-col-head">
            <span>What the model receives</span>
          </div>
          <div className="wb-col-body">
            <ContextMeter
              capacity={TOY_WINDOW}
              title="Context (toy 2,000-token window)"
              segments={[
                { label: "system", tokens: breakdown.system, color: "var(--p2)" },
                { label: "tool definitions", tokens: breakdown.tools, color: "var(--p1)" },
                { label: "conversation", tokens: breakdown.conversation, color: "var(--faint)" },
                { label: "tool results", tokens: breakdown.toolResults, color: "var(--p3)" },
              ]}
            />
            <div className="seg" role="group" aria-label="Payload view">
              <button aria-pressed={view === "request"} onClick={() => setView("request")}>
                {state.phase === "done" ? "Last request" : "Next request"}
              </button>
              <button aria-pressed={view === "response"} onClick={() => setView("response")} disabled={!state.lastResponse}>
                Last response
              </button>
            </div>
            <CodeBlock
              lang="json"
              className="tall"
              code={JSON.stringify(view === "request" ? request : state.lastResponse ?? {}, null, 2)}
            />
          </div>
        </div>
      </div>
      <div className="demo-foot">
        The model here is simulated, so the run is the same every time. The loop, the tools, the messages and the tests are
        real. The same code is in <a href={href.code("lib-simulated-model")}>agent/lib/simulated-model.ts</a>.
      </div>
    </section>
  );
}
