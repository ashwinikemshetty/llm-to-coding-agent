// A tiny hash router. Routes are single tokens like "#stage-memory" or
// "#term-context-window" so a link works anywhere the page is hosted.

import { useEffect, useState } from "react";

export type Route =
  | { page: "home" }
  | { page: "stage"; id: string }
  | { page: "workbench" }
  | { page: "map" }
  | { page: "glossary"; term?: string }
  | { page: "code"; file?: string }
  | { page: "talk" };

export function parse(hash: string): Route {
  const token = hash.replace(/^#/, "");
  if (token.startsWith("stage-")) return { page: "stage", id: token.slice(6) };
  if (token.startsWith("term-")) return { page: "glossary", term: token.slice(5) };
  if (token.startsWith("code-")) return { page: "code", file: token.slice(5) };
  if (token === "glossary") return { page: "glossary" };
  if (token === "workbench") return { page: "workbench" };
  if (token === "map") return { page: "map" };
  if (token === "code") return { page: "code" };
  if (token === "talk") return { page: "talk" };
  return { page: "home" };
}

export const href = {
  home: "#",
  stage: (id: string) => `#stage-${id}`,
  term: (id: string) => `#term-${id}`,
  code: (file?: string) => (file ? `#code-${file}` : "#code"),
  glossary: "#glossary",
  workbench: "#workbench",
  map: "#map",
  talk: "#talk",
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      if (!window.location.hash.startsWith("#term-")) window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function go(hash: string) {
  window.location.hash = hash;
}
