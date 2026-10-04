import { PARTS, STAGES, type PartId } from "../content/stages.ts";
import { TERMS } from "../content/glossary.ts";
import { href } from "../lib/router.ts";

const HERO_TOKENS = ["export", " default", " function"];
const HERO_NEXT: Array<[string, number]> = [
  [" App", 38],
  [" Home", 19],
  [" Page", 13],
  [" Layout", 8],
];

export function Home({ onPresent }: { onPresent: () => void }) {
  return (
    <div className="page">
      <section className="hero">
        <div>
          <span className="eyebrow" style={{ color: "var(--p3)" }}>
            An interactive guide for frontend engineers
          </span>
          <h1 style={{ marginTop: 12 }}>
            From a function that predicts the next token to <em>an agent that fixes your bug.</em>
          </h1>
          <p className="hero-lede">
            No black boxes. We build a coding agent one stage at a time. Each stage fixes a problem the last one had, and
            gives you the words for what's going on.
          </p>
          <div className="row hero-actions">
            <a className="btn primary" href={href.stage("llm")}>
              Start the journey
            </a>
            <button className="btn" onClick={onPresent}>
              Present the talk
            </button>
            <a className="btn ghost" href={href.workbench}>
              Jump to the agent demo
            </a>
          </div>
        </div>
        <div className="token-hero part-1" aria-label="A model predicting the next token">
          <span className="pane-title">What an LLM actually does</span>
          <div className="tokens" style={{ fontSize: "1.1rem" }}>
            {HERO_TOKENS.map((t) => (
              <span className="tok" key={t}>
                {t}
              </span>
            ))}
            <span className="tok" style={{ background: "transparent", outline: "2px dashed var(--p3)" }}>
              {"  ?  "}
            </span>
          </div>
          <div className="bars">
            {HERO_NEXT.map(([token, pct], i) => (
              <div className={`bar ${i === 0 ? "picked" : ""}`} key={token}>
                <span className="label">{token}</span>
                <span className="track">
                  <span className="fill" style={{ width: `${pct * 2}%` }} />
                </span>
                <span className="pct">{pct}%</span>
              </div>
            ))}
          </div>
          <p className="small muted">
            That's the whole model. Chat, memory, tools and agents are code you write around it.
          </p>
        </div>
      </section>

      {([1, 2, 3] as PartId[]).map((part) => (
        <section key={part} className={`part-row part-${part}`}>
          <div className="part-row-head">
            <h2>
              Part {part}: {PARTS[part].name}
            </h2>
            <span className="muted">{PARTS[part].blurb}</span>
          </div>
          <div className="journey-grid">
            {STAGES.filter((s) => s.part === part).map((s) => (
              <a key={s.id} className="journey-card" href={href.stage(s.id)}>
                <span className="stage-dot">{s.label}</span>
                <h3>{s.title}</h3>
                <p>{s.tagline}</p>
                <span className="adds">+ {s.adds}</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <section className="stack">
        <h2>Keep coming back</h2>
        <div className="tools-grid">
          <a className="tool-card" href={href.workbench}>
            <strong>Agent workbench</strong>
            <span>Step through the agent at every stage. See every message, tool call and token.</span>
          </a>
          <a className="tool-card" href={href.map}>
            <strong>Concept map</strong>
            <span>How all {TERMS.length} terms connect, in plain sentences.</span>
          </a>
          <a className="tool-card" href={href.glossary}>
            <strong>Glossary</strong>
            <span>What each term is, why it matters, and where it shows up in the agent.</span>
          </a>
          <a className="tool-card" href={href.code()}>
            <strong>Companion code</strong>
            <span>The same agent in 8 runnable TypeScript steps. Each one is a small diff on the last.</span>
          </a>
          <a className="tool-card" href={href.talk}>
            <strong>Talk plan</strong>
            <span>A 60 or 90 minute run of show, with presenter mode and speaker notes.</span>
          </a>
        </div>
      </section>
    </div>
  );
}
