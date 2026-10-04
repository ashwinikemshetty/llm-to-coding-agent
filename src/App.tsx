import { useCallback, useEffect, useState } from "react";
import { STAGES, PARTS, type PartId } from "./content/stages.ts";
import { href, useRoute, type Route } from "./lib/router.ts";
import { load, save } from "./lib/storage.ts";
import { Home } from "./pages/Home.tsx";
import { ChapterPage } from "./pages/ChapterPage.tsx";
import { Glossary } from "./pages/Glossary.tsx";
import { ConceptMap } from "./pages/ConceptMap.tsx";
import { CodePage } from "./pages/CodePage.tsx";
import { TalkPage } from "./pages/TalkPage.tsx";
import { Presenter } from "./components/Presenter.tsx";
import { Workbench } from "./demos/Workbench.tsx";

type Theme = "system" | "light" | "dark";

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => load<Theme>("theme", "system"));
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      // Only undo a theme we set ourselves; a host page may set its own.
      if (root.dataset.themeOwner === "app") {
        root.removeAttribute("data-theme");
        delete root.dataset.themeOwner;
      }
    } else {
      root.setAttribute("data-theme", theme);
      root.dataset.themeOwner = "app";
    }
    save("theme", theme);
  }, [theme]);
  const cycle = () => setTheme((t) => (t === "system" ? "light" : t === "light" ? "dark" : "system"));
  return { theme, cycle };
}

function Brand() {
  return (
    <a className="brand" href={href.home}>
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-name">
        LLM → Coding Agent
        <small>an interactive guide</small>
      </span>
    </a>
  );
}

function Rail({ route, open, onPresent, theme, cycleTheme }: { route: Route; open: boolean; onPresent: () => void; theme: Theme; cycleTheme: () => void }) {
  const current = (page: Route["page"]) => (route.page === page ? "page" : undefined);
  return (
    <nav className={`rail ${open ? "open" : ""}`} aria-label="Journey">
      <Brand />
      <div className="rail-section track">
        <span className="rail-label">The journey</span>
        {([1, 2, 3] as PartId[]).map((part) => (
          <div key={part} className={`part-${part}`} style={{ display: "contents" }}>
            <span className="part-heading">{PARTS[part].name}</span>
            {STAGES.filter((s) => s.part === part).map((s) => (
              <a
                key={s.id}
                className={`rail-link part-${s.part}`}
                href={href.stage(s.id)}
                aria-current={route.page === "stage" && route.id === s.id ? "page" : undefined}
              >
                <span className="stage-dot">{s.label}</span>
                {s.title}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className="rail-section">
        <span className="rail-label">Explore</span>
        <a className="rail-link" href={href.workbench} aria-current={current("workbench")}>
          Agent workbench
        </a>
        <a className="rail-link" href={href.map} aria-current={current("map")}>
          Concept map
        </a>
        <a className="rail-link" href={href.glossary} aria-current={current("glossary")}>
          Glossary
        </a>
        <a className="rail-link" href={href.code()} aria-current={current("code")}>
          Companion code
        </a>
        <a className="rail-link" href={href.talk} aria-current={current("talk")}>
          Talk plan
        </a>
      </div>
      <div className="rail-footer">
        <button className="btn small" onClick={onPresent}>
          Present
        </button>
        <button className="btn small ghost" onClick={cycleTheme} aria-label={`Theme: ${theme}. Click to change.`}>
          Theme: {theme}
        </button>
      </div>
    </nav>
  );
}

function WorkbenchPage() {
  return (
    <div className="page" style={{ maxWidth: 1480 }}>
      <header className="stack measure">
        <span className="eyebrow" style={{ color: "var(--p3)" }}>
          Live demo
        </span>
        <h1>Agent workbench</h1>
        <p className="muted">
          One bug, six levels of capability. Pick what the model is allowed to do, then step through every model call and
          tool run. The right-hand panel always shows exactly what the model receives.
        </p>
      </header>
      <Workbench standalone />
    </div>
  );
}

export function App() {
  const route = useRoute();
  const { theme, cycle } = useTheme();
  const [railOpen, setRailOpen] = useState(false);
  const [presenting, setPresenting] = useState<{ stage?: string } | null>(null);

  useEffect(() => setRailOpen(false), [route]);

  const present = useCallback((stage?: string) => setPresenting({ stage }), []);
  const exit = useCallback(() => setPresenting(null), []);

  useEffect(() => {
    const titles: Partial<Record<Route["page"], string>> = {
      workbench: "Agent workbench",
      map: "Concept map",
      glossary: "Glossary",
      code: "Companion code",
      talk: "Talk plan",
    };
    const stage = route.page === "stage" ? STAGES.find((s) => s.id === route.id)?.title : undefined;
    const name = stage ?? titles[route.page];
    document.title = name ? `${name} · From LLM to Coding Agent` : "From LLM to Coding Agent";
  }, [route]);

  let page;
  switch (route.page) {
    case "stage":
      page = <ChapterPage key={route.id} id={route.id} onPresent={present} />;
      break;
    case "workbench":
      page = <WorkbenchPage />;
      break;
    case "map":
      page = <ConceptMap />;
      break;
    case "glossary":
      page = <Glossary focus={route.term} />;
      break;
    case "code":
      page = <CodePage file={route.file} />;
      break;
    case "talk":
      page = <TalkPage onPresent={present} />;
      break;
    default:
      page = <Home onPresent={() => present()} />;
  }

  return (
    <>
      <div className="shell">
        <Rail route={route} open={railOpen} onPresent={() => present(route.page === "stage" ? route.id : undefined)} theme={theme} cycleTheme={cycle} />
        {railOpen && <div className="scrim" onClick={() => setRailOpen(false)} />}
        <div style={{ minWidth: 0 }}>
          <header className="topbar">
            <button className="btn small" onClick={() => setRailOpen(true)} aria-label="Open navigation">
              ☰ Menu
            </button>
            <Brand />
            <span className="spacer" />
          </header>
          <main className="main">{page}</main>
        </div>
      </div>
      {presenting && <Presenter startStage={presenting.stage} onExit={exit} />}
    </>
  );
}
