// Terminal output helpers. Nothing to learn here.

import type { ContentBlock, Message, ModelResponse } from "./types.ts";

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};
export const color = c;

export function banner(title: string, subtitle?: string) {
  console.log(`\n${c.bold(c.cyan(`━━ ${title} ━━`))}`);
  if (subtitle) console.log(c.dim(subtitle));
}

export function note(text: string) {
  console.log(c.dim(`\n// ${text}`));
}

export function json(label: string, value: unknown) {
  console.log(`\n${c.yellow(label)}`);
  console.log(c.dim(JSON.stringify(value, null, 2)));
}

export function user(text: string) {
  console.log(`\n${c.bold("you")}  ${text}`);
}

export function block(b: ContentBlock) {
  if (b.type === "text") console.log(`${c.bold(c.magenta("model"))}  ${b.text}`);
  if (b.type === "tool_use") console.log(`${c.bold(c.yellow("tool_use"))}  ${b.name}(${JSON.stringify(b.input)})`);
  if (b.type === "tool_result") {
    const preview = b.content.length > 400 ? `${b.content.slice(0, 400)}…` : b.content;
    console.log(`${c.bold(b.is_error ? c.red("tool_result") : c.green("tool_result"))}  ${c.dim(preview)}`);
  }
}

export function response(r: ModelResponse) {
  console.log("");
  r.content.forEach(block);
  console.log(c.dim(`stop_reason: ${r.stop_reason} · tokens in ${r.usage.input_tokens} / out ${r.usage.output_tokens}`));
}

export function results(m: Message) {
  if (typeof m.content !== "string") m.content.forEach(block);
}
