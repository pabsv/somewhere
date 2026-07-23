export default function AlertsStep({
  notifyOptin,
  onToggle,
}: {
  notifyOptin: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">
          Want a nudge when a steal appears?
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Email alerts aren&rsquo;t live yet. Flip this on and we&rsquo;ll
          switch you in the moment they ship.
        </p>
      </div>

      <div className="overflow-hidden rounded-(--radius-card) bg-night shadow-(--shadow-card)">
        <div className="h-1 bg-brand" aria-hidden="true" />
        <div className="flex items-center gap-4 px-5 py-5">
          <span
            className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-steal"
            aria-hidden="true"
          />
          <p className="flex-1 font-mono text-xs uppercase tracking-widest text-paper/80">
            Coming soon. Email the moment a steal hits one of your stars
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={notifyOptin}
            onClick={onToggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              notifyOptin ? "bg-steal" : "bg-white/15"
            }`}
          >
            <span
              className="absolute top-1 h-5 w-5 rounded-full bg-paper transition-[left] duration-200"
              style={{ left: notifyOptin ? 24 : 4 }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
