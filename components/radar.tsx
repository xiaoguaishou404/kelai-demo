export function Radar({
  axes,
}: {
  axes: { label: string; value: number | null }[];
}) {
  const cx = 140;
  const cy = 136;
  const radius = 86;
  const point = (index: number, scale: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
    return [cx + Math.cos(angle) * radius * scale, cy + Math.sin(angle) * radius * scale];
  };
  const polygon = axes
    .map((axis, index) => point(index, Math.max(0, Math.min(100, axis.value ?? 0)) / 100).join(","))
    .join(" ");
  return (
    <svg viewBox="0 0 280 280" width="280" height="280" role="img" aria-label="六维能力雷达">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          fill={ring === 1 ? "#f3faf6" : "none"}
          stroke="#c9dbd2"
          points={axes.map((_, index) => point(index, ring).join(",")).join(" ")}
        />
      ))}
      <polygon fill="rgba(15,107,92,0.28)" stroke="#0f6b5c" points={polygon} />
      {axes.map((axis, index) => {
        const [x, y] = point(index, 1.18);
        return (
          <text key={axis.label} x={x} y={y} textAnchor="middle" fontSize="11" fill="#24312c">
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
