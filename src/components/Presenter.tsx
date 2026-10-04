// Presenter mode: the same scenes as the reading pages, one per screen.
// Keys: → / Space / PageDown next · ← / PageUp previous · N notes · Esc exit.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CHAPTERS } from "../content/chapters.tsx";
import { PARTS, STAGES } from "../content/stages.ts";
import { StageHeader } from "../pages/ChapterPage.tsx";
import { Quiz } from "./ui.tsx";

type Slide = { stageId: string; part: number; title: string; notes?: string; render: () => ReactNode };

function buildSlides(): Slide[] {
  const slides: Slide[] = [
    {
      stageId: "start",
      part: 1,
      title: "From LLM to Coding Agent",
      notes:
        "Promise: by the end, you'll know exactly what happens between typing a request and a coding agent editing your files, and every word for it. We'll build one, one problem at a time.",
      render: () => (
        <div className="title-slide">
          <span className="eyebrow">A journey in 10 stages</span>
          <h1>From LLM to coding agent</h1>
          <p className="big-idea" style={{ color: "var(--muted)", fontWeight: 500 }}>
            We start with a function that predicts the next word, and end with an agent that fixes a bug and proves it.
          </p>
          <div className="row">
            {([1, 2, 3] as const).map((p) => (
              <span key={p} className={`chip part-${p}`} style={{ borderColor: "var(--part)", color: "var(--part)" }}>
                Part {p}: {PARTS[p].name}
              </span>
            ))}
          </div>
        </div>
      ),
    },
  ];
  for (const stage of STAGES) {
    const chapter = CHAPTERS[stage.id];
    slides.push({
      stageId: stage.id,
      part: stage.part,
      title: stage.title,
      notes: stage.problem ? `Set up the problem: ${stage.problem}` : undefined,
      render: () => (
        <div className="title-slide">
          <StageHeader stage={stage} />
        </div>
      ),
    });
    for (const scene of chapter.scenes) {
      slides.push({
        stageId: stage.id,
        part: stage.part,
        title: scene.title,
        notes: scene.notes,
        render: () => (
          <section className="scene">
            <h2>{scene.title}</h2>
            {scene.body()}
          </section>
        ),
      });
    }
    if (chapter.quiz.length) {
      slides.push({
        stageId: stage.id,
        part: stage.part,
        title: "Check yourself",
        notes: "Ask the room to answer out loud before clicking.",
        render: () => (
          <section className="scene">
            <h2>Check yourself</h2>
            <Quiz questions={chapter.quiz} />
          </section>
        ),
      });
    }
  }
  return slides;
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function Presenter({ startStage, onExit }: { startStage?: string; onExit: () => void }) {
  const slides = useMemo(buildSlides, []);
  const [index, setIndex] = useState(() => {
    const i = slides.findIndex((s) => s.stageId === startStage);
    return i < 0 ? 0 : i;
  });
  const [notes, setNotes] = useState(false);
  const slide = slides[index];
  const stage = STAGES.find((s) => s.id === slide.stageId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex(slides.length - 1);
      else if (e.key.toLowerCase() === "n") setNotes((n) => !n);
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, onExit]);

  useEffect(() => {
    document.querySelector(".presenter-stage")?.scrollTo({ top: 0 });
  }, [index]);

  return (
    <div className={`presenter part-${slide.part}`} role="dialog" aria-modal="true" aria-label="Presenter mode">
      <div className="presenter-top">
        {stage && <span className="stage-dot filled">{stage.label}</span>}
        <span className="where">
          {stage ? `${stage.title} · ` : ""}
          {slide.title}
        </span>
        <button className="btn small" onClick={() => setNotes((n) => !n)} aria-pressed={notes}>
          Notes (N)
        </button>
        <button className="btn small" onClick={onExit}>
          Exit (Esc)
        </button>
      </div>
      <div className="presenter-stage" key={index}>
        {slide.render()}
      </div>
      <div className="presenter-foot">
        <button className="btn small" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          ← Prev
        </button>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
        </div>
        <span className="small muted tabular">
          {index + 1} / {slides.length}
        </span>
        <button
          className="btn small primary"
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          disabled={index === slides.length - 1}
        >
          Next →
        </button>
      </div>
      {notes && (
        <aside className="notes" aria-label="Speaker notes">
          <b>Speaker notes</b>
          <span>{slide.notes ?? "No notes for this slide."}</span>
        </aside>
      )}
    </div>
  );
}
