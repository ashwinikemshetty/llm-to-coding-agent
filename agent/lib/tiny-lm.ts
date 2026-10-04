// A real (very tiny) language model, built by counting.
//
// "Training" = reading a corpus and counting which token follows which.
// "Inference" = turning those counts into probabilities for the next token.
//
// A real LLM replaces the count table with a neural network (a Transformer)
// that has billions of learned numbers (parameters) and was trained on
// trillions of tokens. The interface is identical: tokens in, a probability
// for every possible next token out.

export const CORPUS = `
The button renders a label and calls onClick when clicked .
The button component accepts a variant prop .
The component renders a list of items .
The component re-renders when its state changes .
The state changes when the user types in the input .
The input calls onChange when the user types .
The user clicks the button and the form submits .
The form submits the data to the server .
The server returns the data as JSON .
The hook returns the data and a loading flag .
The hook fetches the data when the component mounts .
The test renders the component and clicks the button .
The test fails when the total is wrong .
The total is the sum of every item price times its quantity .
The cart shows the total and a checkout button .
The model predicts the next token .
The model reads the tokens and predicts the next token .
The agent reads the file and runs the tests .
The agent edits the file when the test fails .
`;

export type Distribution = Array<{ token: string; p: number }>;

export function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export type TinyModel = {
  /** counts[context][next] = how often `next` followed `context` in training. */
  trigrams: Map<string, Map<string, number>>;
  bigrams: Map<string, Map<string, number>>;
  vocabulary: string[];
};

function bump(table: Map<string, Map<string, number>>, context: string, next: string) {
  const row = table.get(context) ?? new Map<string, number>();
  row.set(next, (row.get(next) ?? 0) + 1);
  table.set(context, row);
}

/** Training: read every sentence and count what comes next. */
export function train(corpus: string = CORPUS): TinyModel {
  const model: TinyModel = { trigrams: new Map(), bigrams: new Map(), vocabulary: [] };
  const vocabulary = new Set<string>();
  for (const line of corpus.split("\n")) {
    const tokens = tokenize(line);
    tokens.forEach((token, i) => {
      vocabulary.add(token);
      if (i >= 1) bump(model.bigrams, tokens[i - 1], token);
      if (i >= 2) bump(model.trigrams, `${tokens[i - 2]} ${tokens[i - 1]}`, token);
    });
  }
  model.vocabulary = [...vocabulary];
  return model;
}

/** Inference: the probability of every token that could come next. */
export function nextTokenDistribution(model: TinyModel, tokens: string[]): Distribution {
  const [a, b] = tokens.slice(-2);
  // Use the last two tokens if we have seen them together, otherwise just the last one.
  const row = model.trigrams.get(`${a} ${b}`) ?? model.bigrams.get(b) ?? model.bigrams.get("The");
  if (!row) return [{ token: ".", p: 1 }];
  const total = [...row.values()].reduce((sum, n) => sum + n, 0);
  return [...row.entries()]
    .map(([token, count]) => ({ token, p: count / total }))
    .sort((x, y) => y.p - x.p);
}

/**
 * Temperature reshapes the distribution before we pick.
 * Low (0.1): almost always the top token. 1.0: as trained. High (2.0): flatter, more surprising.
 */
export function applyTemperature(dist: Distribution, temperature: number): Distribution {
  const t = Math.max(temperature, 0.01);
  const weights = dist.map((d) => Math.pow(d.p, 1 / t));
  const sum = weights.reduce((s, w) => s + w, 0);
  return dist.map((d, i) => ({ token: d.token, p: weights[i] / sum }));
}

/** Sampling: roll a weighted die. */
export function sample(dist: Distribution, temperature: number, random: () => number = Math.random): string {
  const shaped = applyTemperature(dist, temperature);
  let roll = random();
  for (const { token, p } of shaped) {
    roll -= p;
    if (roll <= 0) return token;
  }
  return shaped[shaped.length - 1].token;
}
