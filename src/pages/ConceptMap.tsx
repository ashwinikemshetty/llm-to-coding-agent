import { useState } from "react";
import { TERMS, TERM_BY_ID } from "../content/glossary.ts";
import { CONNECTIONS } from "../content/connections.ts";
import { STAGES, STAGE_BY_ID } from "../content/stages.ts";
import { href } from "../lib/router.ts";

const COL_W = 152;
const NODE_W = 132;
const NODE_H = 28;
const ROW_H = 40;
const TOP = 54;

// Lay terms out in columns by stage, in glossary order.
const POSITIONS = new Map<string, { x: number; y: number }>();
STAGES.forEach((stage, col) => {
  TERMS.filter((t) => t.stage === stage.id).forEach((t, row) => {
    POSITIONS.set(t.id, { x: 12 + col * COL_W, y: TOP + row * ROW_H });
  });
});
const HEIGHT = Math.max(...[...POSITIONS.values()].map((p) => p.y)) + NODE_H + 24;
const WIDTH = 12 + STAGES.length * COL_W;

function edgePath(fromId: string, toId: string): string {
  const a = POSITIONS.get(fromId)!;
  const b = POSITIONS.get(toId)!;
  const ay = a.y + NODE_H / 2;
  const by = b.y + NODE_H / 2;
  if (a.x === b.x) {
    // Same column: bulge out to the right.
    const x = a.x + NODE_W;
    const bulge = 26 + Math.abs(ay - by) * 0.12;
    return `M${x} ${ay} C${x + bulge} ${ay} ${x + bulge} ${by} ${x} ${by}`;
  }
  const leftToRight = a.x < b.x;
  const x1 = leftToRight ? a.x + NODE_W : a.x;
  const x2 = leftToRight ? b.x : b.x + NODE_W;
  const mid = (x1 + x2) / 2;
  return `M${x1} ${ay} C${mid} ${ay} ${mid} ${by} ${x2} ${by}`;
}

function shorten(term: string) {
  return term.length > 19 ? `${term.slice(0, 18)}…` : term;
}

export function ConceptMap() {
  const [active, setActive] = useState<string>("context-window");
  const term = TERM_BY_ID.get(active)!;
  const near = new Set<string>([active]);
  const linked = CONNECTIONS.filter((c) => c.from === active || c.to === active);
  linked.forEach((c) => (near.add(c.from), near.add(c.to)));

  return (
    <div className="page" style={{ maxWidth: "none" }}>
      <header className="stack measure">
        <span className="eyebrow">Reference</span>
        <h1>How it all connects</h1>
        <p className="muted">
          Every term on the journey, in columns from the bare model on the left to the full coding agent on the right.
          Click a term to see its connections as sentences.
        </p>
      </header>

      <div className="map-detail">
        <div className={`term-card part-${STAGE_BY_ID.get(term.stage)!.part}`}>
          <h3>{term.term}</h3>
          <p>{term.what}</p>
          <p className="small muted">{term.why}</p>
          <a className="small" href={href.term(term.id)}>
            Full glossary entry →
          </a>
        </div>
        <div className="pane" style={{ background: "var(--surface)" }}>
          <span className="pane-title">Connections</span>
          {linked.length === 0 && <p className="muted small">No direct connections listed.</p>}
          <ul className="edge-list">
            {linked.map((c, i) => (
              <li key={i}>
                <button className="chip" onClick={() => setActive(c.from)}>
                  {TERM_BY_ID.get(c.from)?.term}
                </button>
                <em>{c.label}</em>
                <button className="chip" onClick={() => setActive(c.to)}>
                  {TERM_BY_ID.get(c.to)?.term}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="map-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ minWidth: WIDTH * 0.9 }} role="img" aria-label="Concept map of all terms">
          {STAGES.map((s, col) => (
            <text key={s.id} x={12 + col * COL_W} y={30} className={`map-col-label part-${s.part}`} style={{ fill: "var(--part)" }}>
              {s.label} · {s.short}
            </text>
          ))}
          {CONNECTIONS.map((c, i) => {
            const on = c.from === active || c.to === active;
            return <path key={i} d={edgePath(c.from, c.to)} className={`map-edge ${on ? "on" : "dim"}`} />;
          })}
          {TERMS.map((t) => {
            const p = POSITIONS.get(t.id)!;
            const part = STAGE_BY_ID.get(t.stage)!.part;
            const state = t.id === active ? "active" : near.has(t.id) ? "near" : "dim";
            return (
              <g
                key={t.id}
                className={`map-node part-${part} ${state}`}
                transform={`translate(${p.x} ${p.y})`}
                onClick={() => setActive(t.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActive(t.id)}
                tabIndex={0}
                role="button"
                aria-label={t.term}
                aria-pressed={t.id === active}
              >
                <title>{t.term}</title>
                <rect width={NODE_W} height={NODE_H} rx={7} />
                <text x={10} y={18.5}>
                  {shorten(t.term)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
