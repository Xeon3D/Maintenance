/** Tiny inline trend line (oldest → newest) with optional limit band. Server-safe SVG. */
export function Sparkline({
  values,
  lower,
  upper,
  width = 120,
  height = 32,
}: {
  values: number[];
  lower?: number | null;
  upper?: number | null;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const all = [...values, ...(lower != null ? [lower] : []), ...(upper != null ? [upper] : [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - 2 * pad);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];
  const out = (lower != null && last < lower) || (upper != null && last > upper);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      {upper != null && <line x1={pad} x2={width - pad} y1={y(upper)} y2={y(upper)} stroke="#fca5a5" strokeDasharray="3 3" />}
      {lower != null && <line x1={pad} x2={width - pad} y1={y(lower)} y2={y(lower)} stroke="#fca5a5" strokeDasharray="3 3" />}
      <path d={d} fill="none" stroke="#1f4f8f" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r={2.5} fill={out ? "#b42318" : "#1f4f8f"} />
    </svg>
  );
}
