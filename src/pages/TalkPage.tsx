import { STAGES } from "../content/stages.ts";
import { href } from "../lib/router.ts";

const SHORT: Record<string, { minutes: number; show: string }> = {
  llm: { minutes: 8, show: "Tokenizer presets, next-token demo at two temperatures" },
  chat: { minutes: 5, show: "Base vs chat (“Fix the bug”), then ask the model about our bug" },
  memory: { minutes: 7, show: "Memory demo: name, then history off, then a tiny window" },
  context: { minutes: 4, show: "Workbench: chat only vs code in prompt" },
  "how-code": { minutes: 3, show: "FIM, one sentence on RL with tests, text-to-action diagram" },
  tools: { minutes: 6, show: "You are the harness, all four steps" },
  loop: { minutes: 4, show: "The loop code, then step through the workbench" },
  "coding-agent": { minutes: 6, show: "Workbench coding agent, red to green" },
  production: { minutes: 4, show: "AGENTS.md, deny then allow in the harness, MCP diagram" },
  reveal: { minutes: 3, show: "Anatomy, product map, myths" },
};

export function TalkPage({ onPresent }: { onPresent: (stageId?: string) => void }) {
  let shortClock = 0;
  let longClock = 0;
  return (
    <div className="page">
      <header className="stack measure">
        <span className="eyebrow">For the presenter</span>
        <h1>Talk plan</h1>
        <p className="muted">
          Everything in the talk lives in this site. Presenter mode shows the same scenes as the reading pages, one per
          screen, with speaker notes. After the talk, send people the link.
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => onPresent()}>
            Start presenting
          </button>
          <span className="small muted">
            <kbd>→</kbd> next · <kbd>←</kbd> back · <kbd>N</kbd> notes · <kbd>Esc</kbd> exit
          </span>
        </div>
      </header>

      <section className="stack">
        <h2>Run of show</h2>
        <p className="muted measure">
          The 60-minute version leaves 10 minutes for questions at the end. The 90-minute version covers every scene and
          leaves time to take questions as you go.
        </p>
        <div className="table-wrap">
          <table className="talk-table">
            <thead>
              <tr>
                <th>60 min</th>
                <th>90 min</th>
                <th>Stage</th>
                <th>What to show in the short version</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {STAGES.map((s) => {
                const shortStart = shortClock;
                const longStart = longClock;
                shortClock += SHORT[s.id].minutes;
                longClock += s.minutes;
                return (
                  <tr key={s.id} className={`part-${s.part}`}>
                    <td>
                      {shortStart}–{shortClock}
                    </td>
                    <td>
                      {longStart}–{longClock}
                    </td>
                    <td>
                      <a href={href.stage(s.id)}>
                        <b>
                          {s.label} · {s.title}
                        </b>
                      </a>
                    </td>
                    <td className="muted">{SHORT[s.id].show}</td>
                    <td>
                      <button className="btn small" onClick={() => onPresent(s.id)}>
                        Present
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td>{shortClock}–60</td>
                <td>{longClock}–90</td>
                <td>
                  <b>Questions</b>
                </td>
                <td className="muted">Keep the glossary open to answer “what's X?” questions.</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack measure">
        <h2>Before you start</h2>
        <ul className="checklist" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
          {[
            ["Pick the theme for the room", "Light usually projects better. Use the theme button in the sidebar."],
            ["Zoom the browser to 125–150%", "The demos are built to scale. Check that the workbench's three columns fit."],
            ["Do one dry run of every demo", "Everything is simulated and runs offline, so it behaves the same on stage."],
            ["Open the companion code in a terminal", "Optional: run npm run agent:6 live after the workbench demo for the “it's real” moment."],
            ["Share the link at the end", "The site is the handout. Every scene, demo and term is here to come back to."],
          ].map(([title, text], i) => (
            <li key={title} className="part-2">
              <span className="box">{i + 1}</span>
              <span>
                <b>{title}</b>
                <span className="muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
