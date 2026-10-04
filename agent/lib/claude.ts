// The real model, behind the same callModel() interface.
// Only loaded when USE_REAL_MODEL=1. Needs ANTHROPIC_API_KEY in the environment.

import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock, ModelRequest, ModelResponse } from "./types.ts";

const client = new Anthropic();

export async function callClaude(request: ModelRequest): Promise<ModelResponse> {
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: request.max_tokens,
    system: request.system,
    tools: request.tools,
    messages: request.messages as Anthropic.Beta.BetaMessageParam[],
    // If a safety classifier declines, retry on a suitable fallback model server-side.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`The model declined this request: ${response.stop_details?.explanation ?? "no reason given"}`);
  }

  return {
    // Keep every block (thinking included) so it can be sent back unchanged next turn.
    content: response.content as unknown as ContentBlock[],
    stop_reason: response.stop_reason === "tool_use" ? "tool_use" : response.stop_reason === "max_tokens" ? "max_tokens" : "end_turn",
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
  };
}
