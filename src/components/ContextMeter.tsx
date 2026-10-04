export type Segment = { label: string; tokens: number; color: string };

/** A stacked bar of what fills the context window. */
export function ContextMeter({ segments, capacity, title = "Context window" }: { segments: Segment[]; capacity: number; title?: string }) {
  const used = segments.reduce((sum, s) => sum + s.tokens, 0);
  const over = used > capacity;
  return (
    <div className={`meter ${over ? "over" : ""}`}>
      <div className="meter-label">
        <span>{title}</span>
        <span>
          <b>{used.toLocaleString()}</b> / {capacity.toLocaleString()} tokens{over ? " · over the limit" : ""}
        </span>
      </div>
      <div className="meter-bar" role="img" aria-label={`${used} of ${capacity} tokens used`}>
        {segments.map((s) => (
          <span key={s.label} style={{ width: `${Math.min(100, (s.tokens / capacity) * 100)}%`, background: s.color }} />
        ))}
      </div>
      <div className="meter-legend">
        {segments.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.label} {s.tokens.toLocaleString()}
          </span>
        ))}
      </div>
    </div>
  );
}
