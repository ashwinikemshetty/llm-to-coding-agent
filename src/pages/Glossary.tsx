import { useEffect, useState } from "react";
import { TERMS, TERM_BY_ID } from "../content/glossary.ts";
import { CONNECTIONS } from "../content/connections.ts";
import { STAGES, STAGE_BY_ID } from "../content/stages.ts";
import { href } from "../lib/router.ts";

export function Glossary({ focus }: { focus?: string }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string | null>(null);

  useEffect(() => {
    if (!focus) return;
    setQuery("");
    setStage(null);
    requestAnimationFrame(() => document.getElementById(`card-${focus}`)?.scrollIntoView({ block: "start" }));
  }, [focus]);

  const q = query.trim().toLowerCase();
  const shown = TERMS.filter(
    (t) =>
      (!stage || t.stage === stage) &&
      (!q || `${t.term} ${t.aka ?? ""} ${t.what}`.toLowerCase().includes(q)),
  );

  return (
    <div className="page">
      <header className="stack measure">
        <span className="eyebrow">Reference</span>
        <h1>Glossary</h1>
        <p className="muted">
          {TERMS.length} terms in the order you meet them on the journey. Each says what it is, why you should care, and
          where it shows up in the agent we build.
        </p>
      </header>
      <div className="glossary-tools">
        <input
          id="glossary-search"
          className="input"
          type="search"
          placeholder="Search terms"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search terms"
        />
        <div className="row">
          <button className="chip" aria-pressed={!stage} onClick={() => setStage(null)}>
            All
          </button>
          {STAGES.map((s) => (
            <button
              key={s.id}
              className={`chip part-${s.part}`}
              aria-pressed={stage === s.id}
              style={stage === s.id ? { background: "var(--part-soft)", borderColor: "var(--part)" } : undefined}
              onClick={() => setStage(stage === s.id ? null : s.id)}
            >
              {s.label} · {s.title}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 && <p className="muted">No terms match “{query}”.</p>}
      <div className="term-grid">
        {shown.map((t) => {
          const s = STAGE_BY_ID.get(t.stage)!;
          const links = CONNECTIONS.filter((c) => c.from === t.id || c.to === t.id);
          return (
            <article key={t.id} id={`card-${t.id}`} className={`term-card part-${s.part} ${focus === t.id ? "target" : ""}`}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3>{t.term}</h3>
                <a className="small" href={href.stage(s.id)}>
                  Stage {s.label}
                </a>
              </div>
              {t.aka && <span className="small muted">Also: {t.aka}</span>}
              <dl>
                <div>
                  <dt>What it is</dt>
                  <dd>{t.what}</dd>
                </div>
                <div>
                  <dt>Why it matters</dt>
                  <dd>{t.why}</dd>
                </div>
                <div>
                  <dt>In our agent</dt>
                  <dd>{t.where}</dd>
                </div>
                {links.length > 0 && (
                  <div>
                    <dt>How it connects</dt>
                    <dd>
                      <ul className="edge-list">
                        {links.map((c, i) => (
                          <li key={i}>
                            <a href={href.term(c.from)}>{TERM_BY_ID.get(c.from)?.term}</a>
                            <em>{c.label}</em>
                            <a href={href.term(c.to)}>{TERM_BY_ID.get(c.to)?.term}</a>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}
