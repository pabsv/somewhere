export interface SparkPoint {
  p: number;
  at: string;
}

interface SparkProps {
  points: SparkPoint[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Tiny inline price sparkline. Ink-muted stroke; the last point gets a
 * steal-green dot when the price has dropped since the first point.
 */
export default function Spark({
  points,
  width = 64,
  height = 20,
  className = "",
}: SparkProps) {
  if (points.length === 0) return null;

  const pad = 2.5;
  const prices = points.map((pt) => pt.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const coords = prices.map((p, i) => {
    const x =
      prices.length === 1
        ? pad + innerW
        : pad + (i / (prices.length - 1)) * innerW;
    const y = pad + (1 - (p - min) / range) * innerH;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });

  const [lastX, lastY] = coords[coords.length - 1];
  const falling = prices[prices.length - 1] < prices[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {coords.length > 1 && (
        <polyline
          points={coords.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="var(--color-ink-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <circle
        cx={lastX}
        cy={lastY}
        r="2"
        fill={falling ? "var(--color-steal)" : "var(--color-ink)"}
      />
    </svg>
  );
}
