interface Props {
  value: number;
  max?: number;
  segments?: number;
  color?: string;
}

export default function SegmentedBar({ value, max = 100, segments = 20, color = '#eabd52' }: Props) {
  const litCount = Math.round((Math.max(0, Math.min(max, value)) / max) * segments);
  return (
    <div className="stat-bar-segmented" style={{ '--seg-color': color } as React.CSSProperties}>
      {Array.from({ length: segments }).map((_, i) => (
        <span key={i} className={`stat-bar-segmented__seg ${i < litCount ? 'is-lit' : ''}`} />
      ))}
    </div>
  );
}
