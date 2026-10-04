// The shapes every step talks in.
//
// These mirror the Anthropic Messages API (other providers use very similar
// shapes). Learn these few types and every "AI SDK" stops looking magic:
// a request is a list of messages, a response is a list of content blocks.

export type TextBlock = { type: "text"; text: string };

/** The model asking *your program* to run a tool. The model never runs it itself. */
export type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};

/** Your program reporting back what the tool returned. */
export type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

/** Reasoning a real model may return. We pass it back untouched. */
export type ThinkingBlock = { type: "thinking"; thinking: string; signature: string };

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock;

export type Message = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};

/** A tool is just a name, a description, and a JSON Schema for its input. */
export type Tool = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
};

export type ModelRequest = {
  system?: string;
  messages: Message[];
  tools?: Tool[];
  max_tokens: number;
};

export type StopReason = "end_turn" | "tool_use" | "max_tokens";

export type ModelResponse = {
  content: ContentBlock[];
  /** Why the model stopped: finished, wants a tool run, or hit the length cap. */
  stop_reason: StopReason;
  usage: { input_tokens: number; output_tokens: number };
};

/** Rough rule of thumb for English and code: one token is about 4 characters. */
export function estimateTokens(value: unknown): number {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return Math.ceil(text.length / 4);
}

export function textOf(content: Message["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((block) => {
      if (block.type === "text") return block.text;
      if (block.type === "tool_result") return block.content;
      return "";
    })
    .join("\n");
}
