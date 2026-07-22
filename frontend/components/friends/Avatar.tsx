// ─── Initials avatar — shared across the Friends surfaces ────────────────────
// Pure presentational circle with derived initials; sized via props so the
// requests rows (36px), group stacks (28px) and friend tiles (52px) share it.

export function initialsOf(name: string, email?: string): string {
  const source = name.trim() || (email ?? "");
  if (!source) return "?";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function Avatar({
  name,
  email,
  size = 36,
  className = "",
}: {
  name: string;
  email?: string;
  size?: number;
  className?: string;
}) {
  const fontSize = Math.max(10, Math.round(size / 3.2));
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-line/60 font-semibold text-ink-muted ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initialsOf(name, email)}
    </span>
  );
}
