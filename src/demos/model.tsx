// Stage 0 demos: tokens, next-token prediction, a tiny trainable LM, embeddings, attention.

import { useMemo, useState } from "react";
import { Demo, T } from "../components/ui.tsx";
import { tokenize } from "../lib/tokenizer.ts";
import {
  applyTemperature,
  CORPUS,
  nextTokenDistribution,
  sample,
  tokenize as wordTokens,
  train,
  type Distribution,
} from "../../agent/lib/tiny-lm.ts";

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

const TOKEN_PRESETS: Array<[string, string]> = [
  ["English", "The quick brown fox jumps over the lazy dog."],
  ["React", "const [count, setCount] = useState(0);"],
  ["JSON", '{"user": {"id": 42, "name": "Asha", "isAdmin": false}}'],
  ["strawberry", "How many r's are in strawberry?"],
  ["Hindi", "नमस्ते, आप कैसे हैं?"],
  ["Emoji", "Ship it 🚀🔥"],
];

export function TokenizerDemo() {
  const [text, setText] = useState(TOKEN_PRESETS[1][1]);
  const tokens = useMemo(() => tokenize(text), [text]);
  const chars = [...text].length;
  return (
    <Demo
      title="Tokenizer"
      foot={
        <>
          Illustrative tokenizer: real ones learn their pieces from data, so exact splits differ by model. The patterns
          are the same.
        </>
      }
    >
      <div className="row">
        {TOKEN_PRESETS.map(([label, value]) => (
          <button key={label} className="chip" onClick={() => setText(value)} aria-pressed={text === value}>
            {label}
          </button>
        ))}
      </div>
      <label className="field">
        Type anything
        <textarea id="tokenizer-input" className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="tokens" aria-label="Tokens">
        {tokens.map((t, i) =>
          t.text === "\n" ? <span key={i} className="tok nl" /> : (
            <span key={i} className="tok" title={`token id ${t.id}`}>
              {t.text}
            </span>
          ),
        )}
      </div>
      <div className="tok-ids">[{tokens.map((t) => t.id).join(", ")}]</div>
      <div className="stat-row">
        <div className="stat">
          <b>{chars}</b>
          <span>characters</span>
        </div>
        <div className="stat">
          <b>{tokens.length}</b>
          <span>tokens</span>
        </div>
        <div className="stat">
          <b>{tokens.length ? (chars / tokens.length).toFixed(1) : "0"}</b>
          <span>characters per token</span>
        </div>
      </div>
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// Next-token prediction, temperature, top-p
// ---------------------------------------------------------------------------

type Preset = { prompt: string; next: Distribution };

const NEXT_PRESETS: Preset[] = [
  {
    prompt: "const [count, setCount] = use",
    next: [
      { token: "State", p: 0.9 },
      { token: "Reducer", p: 0.04 },
      { token: "Signal", p: 0.02 },
      { token: "Ref", p: 0.015 },
      { token: "Memo", p: 0.012 },
      { token: "Effect", p: 0.008 },
      { token: "Context", p: 0.005 },
    ],
  },
  {
    prompt: "The capital of France is",
    next: [
      { token: " Paris", p: 0.92 },
      { token: " a", p: 0.025 },
      { token: " located", p: 0.018 },
      { token: " the", p: 0.014 },
      { token: " known", p: 0.012 },
      { token: " Lyon", p: 0.006 },
      { token: " not", p: 0.005 },
    ],
  },
  {
    prompt: "export default function",
    next: [
      { token: " App", p: 0.38 },
      { token: " Home", p: 0.19 },
      { token: " Page", p: 0.13 },
      { token: " Layout", p: 0.08 },
      { token: " Button", p: 0.06 },
      { token: " Header", p: 0.05 },
      { token: " handler", p: 0.04 },
      { token: " Dashboard", p: 0.03 },
    ],
  },
  {
    prompt: "My favourite colour is",
    next: [
      { token: " blue", p: 0.3 },
      { token: " green", p: 0.18 },
      { token: " purple", p: 0.12 },
      { token: " red", p: 0.11 },
      { token: " black", p: 0.08 },
      { token: " yellow", p: 0.06 },
      { token: " orange", p: 0.05 },
      { token: " teal", p: 0.03 },
    ],
  },
];

function nucleus(dist: Distribution, topP: number): Set<string> {
  const kept = new Set<string>();
  let sum = 0;
  for (const d of [...dist].sort((a, b) => b.p - a.p)) {
    kept.add(d.token);
    sum += d.p;
    if (sum >= topP) break;
  }
  return kept;
}

export function NextTokenDemo() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [temperature, setTemperature] = useState(1);
  const [topP, setTopP] = useState(1);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [last, setLast] = useState<string | null>(null);
  const preset = NEXT_PRESETS[presetIndex];

  const shaped = applyTemperature(preset.next, temperature);
  const kept = nucleus(shaped, topP);
  const renormalised = shaped.filter((d) => kept.has(d.token));
  const total = Object.values(tally).reduce((s, n) => s + n, 0);

  const roll = (times: number) => {
    const next = { ...tally };
    let pick = "";
    for (let i = 0; i < times; i++) {
      // temperature already applied above, so sample the kept set at T=1
      pick = sample(renormalised, 1);
      next[pick] = (next[pick] ?? 0) + 1;
    }
    setTally(next);
    setLast(pick);
  };

  const choose = (index: number) => {
    setPresetIndex(index);
    setTally({});
    setLast(null);
  };

  return (
    <Demo title="Predict the next token" foot="Probabilities are illustrative, shaped like a real model's output.">
      <div className="row">
        {NEXT_PRESETS.map((p, i) => (
          <button key={p.prompt} className="chip" aria-pressed={i === presetIndex} onClick={() => choose(i)}>
            {p.prompt}
          </button>
        ))}
      </div>
      <div className="code">
        <pre>
          {preset.prompt}
          {last ? <span className="t-special">{last}</span> : <span className="t-com">▍</span>}
        </pre>
      </div>
      <div className="split">
        <div className="stack">
          <label className="field">
            <span>
              <T id="temperature">Temperature</T>: <b className="tabular">{temperature.toFixed(1)}</b>
            </span>
            <input
              id="temperature"
              type="range"
              min={0.1}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => {
                setTemperature(Number(e.target.value));
                setTally({});
              }}
            />
          </label>
          <label className="field">
            <span>
              <T id="top-p">Top-p</T>: <b className="tabular">{topP.toFixed(2)}</b>
            </span>
            <input
              id="top-p"
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={topP}
              onChange={(e) => {
                setTopP(Number(e.target.value));
                setTally({});
              }}
            />
          </label>
          <div className="row">
            <button className="btn primary" onClick={() => roll(1)}>
              Sample once
            </button>
            <button className="btn" onClick={() => roll(20)}>
              Sample 20 times
            </button>
          </div>
        </div>
        <div className="bars part-1" aria-label="Next-token probabilities">
          {shaped.map((d) => (
            <div key={d.token} className={`bar ${kept.has(d.token) ? "" : "excluded"} ${d.token === last ? "picked" : ""}`}>
              <span className="label">{JSON.stringify(d.token).slice(1, -1)}</span>
              <span className="track">
                <span className="fill" style={{ width: `${d.p * 100}%` }} />
              </span>
              <span className="pct">
                {(d.p * 100).toFixed(1)}%{total ? ` · ${tally[d.token] ?? 0}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
      {total > 0 && (
        <p className="small muted">
          {total} samples so far. The number after each bar counts how often that token was picked.
        </p>
      )}
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// A tiny language model you can train in the browser
// ---------------------------------------------------------------------------

export function TinyLMDemo() {
  const [corpus, setCorpus] = useState(CORPUS.trim());
  const [prompt, setPrompt] = useState("The test");
  const [temperature, setTemperature] = useState(0.7);
  const [generated, setGenerated] = useState<string[]>([]);
  const model = useMemo(() => train(corpus), [corpus]);
  const context = [...wordTokens(prompt), ...generated];
  const dist = nextTokenDistribution(model, context);
  const finished = generated.at(-1) === "." || generated.length >= 30;

  const stepOnce = () => setGenerated((g) => [...g, sample(dist, temperature)]);
  const runAll = () => {
    const out = [...generated];
    for (let i = 0; i < 30; i++) {
      const next = sample(nextTokenDistribution(model, [...wordTokens(prompt), ...out]), temperature);
      out.push(next);
      if (next === ".") break;
    }
    setGenerated(out);
  };

  return (
    <Demo
      title="Train a language model in your browser"
      tag="Real code"
      foot={
        <>
          This is <code>agent/lib/tiny-lm.ts</code>. Training counts which word follows each pair of words. A real LLM
          learns billions of <T id="parameters">parameters</T> instead of a count table.
        </>
      }
    >
      <div className="split">
        <label className="field">
          Training data ({model.vocabulary.length} distinct words). Edit it and the model retrains instantly.
          <textarea
            id="tiny-corpus"
            className="input"
            rows={9}
            value={corpus}
            onChange={(e) => {
              setCorpus(e.target.value);
              setGenerated([]);
            }}
          />
        </label>
        <div className="stack">
          <label className="field">
            Prompt
            <input
              id="tiny-prompt"
              className="input"
              type="text"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setGenerated([]);
              }}
            />
          </label>
          <label className="field">
            <span>
              Temperature <b className="tabular">{temperature.toFixed(1)}</b>
            </span>
            <input
              id="tiny-temp"
              type="range"
              min={0.1}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </label>
          <div className="code">
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {prompt} <span className="t-str">{generated.join(" ")}</span>
            </pre>
          </div>
          <div className="row">
            <button className="btn primary" onClick={stepOnce} disabled={finished}>
              Next token
            </button>
            <button className="btn" onClick={runAll} disabled={finished}>
              Generate to the end
            </button>
            <button className="btn ghost" onClick={() => setGenerated([])}>
              Clear
            </button>
          </div>
          <div className="pane-title">After “{context.slice(-2).join(" ")}” the model predicts</div>
          <div className="bars part-1">
            {dist.slice(0, 5).map((d) => (
              <div className="bar" key={d.token}>
                <span className="label">{d.token}</span>
                <span className="track">
                  <span className="fill" style={{ width: `${d.p * 100}%` }} />
                </span>
                <span className="pct">{(d.p * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// Embeddings: meaning as position
// ---------------------------------------------------------------------------

const WORDS: Array<[string, number, number, string]> = [
  ["button", 120, 90, "UI"],
  ["checkbox", 165, 120, "UI"],
  ["input", 95, 140, "UI"],
  ["form", 150, 165, "UI"],
  ["modal", 200, 85, "UI"],
  ["dropdown", 215, 145, "UI"],
  ["fetch", 470, 95, "Network"],
  ["request", 520, 70, "Network"],
  ["response", 560, 120, "Network"],
  ["API", 500, 150, "Network"],
  ["JSON", 445, 160, "Network"],
  ["server", 590, 175, "Network"],
  ["cat", 140, 330, "Animals"],
  ["kitten", 175, 360, "Animals"],
  ["dog", 105, 380, "Animals"],
  ["puppy", 140, 410, "Animals"],
  ["horse", 220, 410, "Animals"],
  ["happy", 480, 330, "Feelings"],
  ["glad", 520, 355, "Feelings"],
  ["joyful", 465, 385, "Feelings"],
  ["sad", 590, 400, "Feelings"],
  ["angry", 625, 345, "Feelings"],
];

const GROUP_CLASS: Record<string, string> = { UI: "d-p1", Network: "d-p2", Animals: "d-p3", Feelings: "d-warn" };

export function EmbeddingDemo() {
  const [selected, setSelected] = useState("button");
  const me = WORDS.find((w) => w[0] === selected)!;
  const nearest = WORDS.filter((w) => w[0] !== selected)
    .map((w) => ({ w, d: Math.hypot(w[1] - me[1], w[2] - me[2]) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  const vector = Array.from({ length: 8 }, (_, i) => Math.sin(me[1] * (i + 1) * 0.013 + me[2] * 0.021 * (i + 2)).toFixed(2));

  return (
    <Demo
      title="Embeddings: meaning becomes position"
      foot="A 2D sketch. Real embeddings have hundreds to thousands of dimensions, but similar meanings still sit close together."
    >
      <div className="diagram" style={{ padding: 0, border: 0 }}>
        <svg viewBox="0 0 700 470" role="img" aria-label="Words plotted by meaning">
          {nearest.map(({ w }) => (
            <line key={w[0]} x1={me[1]} y1={me[2]} x2={w[1]} y2={w[2]} className="d-line p3" />
          ))}
          {WORDS.map(([word, x, y, group]) => (
            <g
              key={word}
              className="map-node"
              onClick={() => setSelected(word)}
              onKeyDown={(e) => e.key === "Enter" && setSelected(word)}
              tabIndex={0}
              role="button"
              aria-label={word}
            >
              <circle cx={x} cy={y} r={word === selected ? 9 : 6} className={GROUP_CLASS[group]} />
              <text x={x + 12} y={y + 4} className="d-text" style={{ fontWeight: word === selected ? 700 : 400 }}>
                {word}
              </text>
            </g>
          ))}
          {Object.entries({ UI: [70, 40], Network: [430, 40], Animals: [70, 290], Feelings: [430, 290] }).map(([g, [x, y]]) => (
            <text key={g} x={x} y={y} className="d-label">
              {g.toUpperCase()}
            </text>
          ))}
        </svg>
      </div>
      <div className="split">
        <div className="pane">
          <span className="pane-title">“{selected}” as numbers</span>
          <code style={{ whiteSpace: "normal" }}>[{vector.join(", ")}, …]</code>
        </div>
        <div className="pane">
          <span className="pane-title">Closest in meaning</span>
          <span>{nearest.map(({ w }) => w[0]).join(" · ")}</span>
        </div>
      </div>
    </Demo>
  );
}

// ---------------------------------------------------------------------------
// Attention
// ---------------------------------------------------------------------------

const SENTENCE = ["The", "button", "calls", "onClick", "when", "it", "is", "pressed", "."];
const WEIGHTS: Record<number, number[]> = {
  1: [0.7, 0.3],
  2: [0.12, 0.62, 0.26],
  3: [0.04, 0.38, 0.4, 0.18],
  5: [0.03, 0.64, 0.08, 0.14, 0.04, 0.07],
  7: [0.02, 0.33, 0.06, 0.1, 0.07, 0.27, 0.1, 0.05],
};

export function AttentionDemo() {
  const [focus, setFocus] = useState(5);
  const weights = WEIGHTS[focus] ?? Array.from({ length: focus + 1 }, () => 1 / (focus + 1));
  return (
    <Demo title="Attention: which earlier tokens matter?" foot="Weights are illustrative. Real models have dozens of attention heads per layer, each looking for different relationships.">
      <p className="small muted">Click a word to see where it looks. Tokens can only look backwards, at what came before.</p>
      <div className="tokens" style={{ fontSize: "1.15rem", gap: 6 }}>
        {SENTENCE.map((word, i) => {
          const w = i <= focus ? weights[i] ?? 0 : 0;
          return (
            <button
              key={i}
              onClick={() => setFocus(i)}
              className="tok"
              style={{
                border: i === focus ? "2px solid var(--p1)" : "2px solid transparent",
                background: i === focus ? "var(--p1-soft)" : `color-mix(in srgb, var(--p3) ${Math.round(w * 100)}%, transparent)`,
                cursor: "pointer",
                padding: "2px 6px",
                opacity: i > focus ? 0.35 : 1,
                font: "inherit",
              }}
              aria-pressed={i === focus}
            >
              {word}
            </button>
          );
        })}
      </div>
      <div className="bars part-3">
        {weights.map((w, i) => (
          <div className="bar" key={i}>
            <span className="label">{SENTENCE[i]}</span>
            <span className="track">
              <span className="fill" style={{ width: `${w * 100}%` }} />
            </span>
            <span className="pct">{Math.round(w * 100)}%</span>
          </div>
        ))}
      </div>
    </Demo>
  );
}
