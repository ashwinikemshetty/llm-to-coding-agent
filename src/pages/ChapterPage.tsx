import { CHAPTERS } from "../content/chapters.tsx";
import { TERMS } from "../content/glossary.ts";
import { neighbours, PARTS, STAGE_BY_ID, type Stage } from "../content/stages.ts";
import { Quiz } from "../components/ui.tsx";
import { href } from "../lib/router.ts";

export function StageHeader({ stage }: { stage: Stage }) {
  const vocab = TERMS.filter((t) => t.stage === stage.id);
  return (
    <header className={`chapter-head part-${stage.part}`}>
      <div className="row">
        <span className="stage-dot">{stage.label}</span>
        <span className="eyebrow">
          Part {stage.part} · {PARTS[stage.part].name}
        </span>
      </div>
      <h1>{stage.title}</h1>
      <p className="tagline">{stage.tagline}</p>
      {stage.problem && (
        <div className="problem">
          <span className="label">Problem</span>
          <span>{stage.problem}</span>
        </div>
      )}
      <div className="problem solves">
        <span className="label">Adds</span>
        <span>{stage.adds}</span>
      </div>
      {vocab.length > 0 && (
        <div className="vocab-strip">
          <span className="small muted">New words:</span>
          {vocab.map((t) => (
            <a key={t.id} className="chip" href={href.term(t.id)}>
              {t.term}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

export function ChapterPage({ id, onPresent }: { id: string; onPresent: (stageId: string) => void }) {
  const stage = STAGE_BY_ID.get(id);
  const chapter = CHAPTERS[id];
  if (!stage || !chapter) {
    return (
      <div className="page">
        <h1>Stage not found</h1>
        <p>
          <a href={href.home}>Back to the start</a>
        </p>
      </div>
    );
  }
  const { prev, next } = neighbours(id);
  return (
    <article className={`page part-${stage.part}`}>
      <div className="stack">
        <StageHeader stage={stage} />
        <div className="row">
          <button className="btn" onClick={() => onPresent(id)}>
            Present this stage
          </button>
          {stage.step && (
            <a className="btn ghost" href={href.code(stage.step)}>
              Companion code: {stage.step}.ts
            </a>
          )}
          <span className="small muted">About {stage.minutes} min</span>
        </div>
      </div>

      {chapter.scenes.map((scene) => (
        <section key={scene.id} className="scene" id={`${id}--${scene.id}`}>
          <div className="scene-head">
            <h2>{scene.title}</h2>
          </div>
          {scene.body()}
        </section>
      ))}

      {chapter.quiz.length > 0 && (
        <section className="scene">
          <div className="scene-head">
            <span className="eyebrow">Check yourself</span>
            <h2>Quick quiz</h2>
          </div>
          <Quiz questions={chapter.quiz} />
        </section>
      )}

      <nav className="chapter-nav" aria-label="Stages">
        {prev && (
          <a href={href.stage(prev.id)}>
            <small>← Previous</small>
            <strong>{prev.title}</strong>
          </a>
        )}
        {next && (
          <a className="next" href={href.stage(next.id)}>
            <small>Next →</small>
            <strong>{next.title}</strong>
          </a>
        )}
      </nav>
    </article>
  );
}
