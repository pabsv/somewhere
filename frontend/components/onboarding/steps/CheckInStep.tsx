import FareTag from "@/components/ui/FareTag";
import Badge from "@/components/ui/Badge";
import FlapText from "@/components/board/FlapText";

const PITCH_ROWS = [
  { text: "Pick your airports — we watch every route out of them." },
  { text: "Mark the days you're free — we only show trips that fit." },
  { text: "A steal appears — you already know, before you even looked." },
];

export default function CheckInStep() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Open to go anywhere,
          <br />
          on any free day.
        </h1>
        <p className="mt-3 max-w-md text-base text-ink-muted">
          Two minutes of setup, then Somewhere quietly watches for cheap
          flights so you don&rsquo;t have to.
        </p>
      </div>

      <ul className="space-y-3">
        {PITCH_ROWS.map((row, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-(--radius-card) border border-line bg-card px-4 py-3 shadow-(--shadow-card)"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs text-paper">
              {i + 1}
            </span>
            <span className="text-sm text-ink">{row.text}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3 rounded-(--radius-card) bg-night px-4 py-3">
        <FlapText text="EIN→BCN" size="sm" />
        <span className="flex-1 truncate font-display text-sm text-paper">
          Barcelona
        </span>
        <FareTag price={38} tier="steal" size="sm" />
        <Badge variant="steal" />
      </div>
    </div>
  );
}
