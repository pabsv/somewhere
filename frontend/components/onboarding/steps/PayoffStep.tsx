import DepartureBoard, {
  BoardSkeleton,
  type DepartureRow,
} from "@/components/board/DepartureBoard";

export default function PayoffStep({
  rows,
  onFinish,
}: {
  rows: DepartureRow[] | null;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">
          Already waiting for you.
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          You&rsquo;re set up. Here&rsquo;s what&rsquo;s cheap right now from
          your airports.
        </p>
      </div>

      {rows === null ? <BoardSkeleton /> : <DepartureBoard rows={rows} />}

      <button
        type="button"
        onClick={onFinish}
        className="w-full rounded-(--radius-tag) bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-night"
      >
        Take me to my calendar →
      </button>
    </div>
  );
}
