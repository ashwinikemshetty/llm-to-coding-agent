// One function the rest of the code calls: request in, response out.
//
// By default it uses the simulated model (offline, free, repeatable).
// Run any step with USE_REAL_MODEL=1 and an ANTHROPIC_API_KEY to call a real
// model instead. Nothing else in the step changes, which is the point:
// the harness doesn't care what is behind this function.

import { simulatedModel } from "./simulated-model.ts";
import type { ModelRequest, ModelResponse } from "./types.ts";

export const usingRealModel = process.env.USE_REAL_MODEL === "1";

export async function callModel(request: ModelRequest): Promise<ModelResponse> {
  if (usingRealModel) {
    const { callClaude } = await import("./claude.ts");
    return callClaude(request);
  }
  return simulatedModel(request);
}
