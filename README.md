# From LLM to Coding Agent

An interactive guide for frontend engineers. It starts with a function that
predicts the next token and ends with an agent that fixes a bug and proves it
with tests. Every stage solves a problem the previous one had, and introduces
the vocabulary for it.

It's a talk and a reference in one: read it at your own pace, or press
**Present** for a slide-by-slide version with speaker notes.

## What's inside

| | |
| --- | --- |
| **The journey** | 10 stages in 3 parts: the model, the conversation, the agent. Every stage has live demos, diagrams and a short quiz. |
| **Agent workbench** | One bug, six levels of capability. Step through every model call and tool run and see exactly what the model receives. |
| **Concept map** | Every term and how it connects to the others, as plain sentences. |
| **Glossary** | Each term: what it is, why it matters, and where it shows up in the agent. |
| **Companion code** | The same agent as 8 runnable TypeScript files in [`agent/`](agent/README.md), each a small change on the last. |
| **Talk plan** | 60 and 90 minute run of show, presenter mode, speaker notes. |

## Run it

```bash
npm install
npm run dev        # the site, at http://localhost:5173
npm run agent:6    # the coding agent, in your terminal
```

Needs Node 22.18 or newer. Everything runs offline. The model is simulated, so
demos behave the same way every time; the messages, tools, loop and tests are
real. See [`agent/README.md`](agent/README.md) to plug in a real model.

## Presenter mode

Click **Present** (or **Present this stage** on any stage).

| Key | Action |
| --- | --- |
| `→` `Space` `PageDown` | Next |
| `←` `PageUp` | Previous |
| `N` | Speaker notes |
| `Esc` | Exit |

## Publish it

`npm run build` writes a static site to `dist/` with relative paths, so it can
be hosted anywhere. The included workflow (`.github/workflows/pages.yml`)
deploys to GitHub Pages on every push to `main` once Pages is set to
"GitHub Actions" in the repository settings.

## Project layout

```
agent/            runnable companion code (steps 0-7, simulated model, toy project)
src/content/      the narrative: stages, scenes, glossary, connections
src/demos/        interactive demos, including the workbench
src/diagrams/     SVG diagrams
src/pages/        home, stage, glossary, concept map, code, talk plan
```

To edit the talk, start in `src/content/chapters.tsx` (scenes and speaker notes)
and `src/content/glossary.ts` (terms).
