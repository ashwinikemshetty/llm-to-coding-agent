// An ILLUSTRATIVE tokenizer. Real tokenizers (BPE) learn 100k-200k pieces
// from data. This one uses a small hand-written vocabulary, but behaves in
// the ways that matter for intuition:
//   - common words are one token, usually with their leading space
//   - rare words and identifiers split into pieces
//   - camelCase splits at the capitals
//   - non-Latin scripts and emoji cost several tokens per character

const COMMON = new Set(
  `the a an and or of to in is it that for on with as was are be this by at from not but have has you your we they can will
  quick brown fox jumps over lazy dog how many are there what why where when who which do does did make model token
  user name hello world cart total price item items button click form input state data function return const let true false
  null undefined export import default new if else for while use set get count value error test tests file files code bug fix
  react component props render page app type string number about into than then just some all one two`
    .split(/\s+/)
    .filter(Boolean),
);

const PIECES = [
  "berry", "straw", "str", "aw", "ing", "tion", "ment", "able", "ed", "er", "ly", "est", "ness", "pre", "re", "un",
  "State", "Effect", "Ref", "Memo", "Count", "Click", "Change", "Submit", "Total", "Price", "Item", "Cart", "set", "use",
  "on", "handle", "get", "is", "id", "name", "user", "json", "fetch", "async",
];

export type Token = { text: string; id: number };

function hashId(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return (h >>> 0) % 100_000;
}

function splitWord(word: string): string[] {
  // camelCase: useState -> use | State
  const camel = word.split(/(?=[A-Z][a-z])/).filter(Boolean);
  if (camel.length > 1) return camel.flatMap((part, i) => (i === 0 ? splitWord(part) : splitPiece(part)));
  return splitPiece(word);
}

function splitPiece(word: string): string[] {
  const bare = word.trim().toLowerCase();
  if (COMMON.has(bare) || word.trim().length <= 3) return [word];
  const out: string[] = [];
  let rest = word;
  while (rest.length) {
    const lead = rest.match(/^\s+/)?.[0] ?? "";
    const body = rest.slice(lead.length);
    const piece = PIECES.find((p) => body.startsWith(p) && body.length > p.length - 1);
    if (piece) {
      out.push(lead + piece);
      rest = body.slice(piece.length);
      continue;
    }
    const size = body.length <= 5 ? body.length : 4;
    out.push(lead + body.slice(0, size));
    rest = body.slice(size);
  }
  return out;
}

export function tokenize(text: string): Token[] {
  const chunks =
    text.match(/'s|'t|'re|'ve|'m|'ll|'d| ?[A-Za-z]+| ?\d{1,3}|\n| ?[^\sA-Za-z\d]| +(?=\S)| +/gu) ?? [];
  const tokens: string[] = [];
  for (const chunk of chunks) {
    if (/[A-Za-z]/.test(chunk)) tokens.push(...splitWord(chunk));
    else if (/[^\x00-\x7F]/.test(chunk)) {
      // Non-ASCII: roughly one token per byte pair. Show one piece per character,
      // and a second piece for characters that need 3-4 bytes.
      for (const ch of chunk) {
        const bytes = new TextEncoder().encode(ch).length;
        tokens.push(ch);
        if (bytes >= 3) tokens.push("·");
      }
    } else tokens.push(chunk);
  }
  return tokens.map((t) => ({ text: t, id: hashId(t) }));
}
