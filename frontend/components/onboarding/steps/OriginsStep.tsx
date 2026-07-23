import OriginChips from "@/components/settings/OriginChips";

export default function OriginsStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">
          Where do you fly from?
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Pick airports you&rsquo;d realistically leave from. Change this any time
          in Settings.
        </p>
      </div>
      <div className="flex justify-center">
        <OriginChips selected={selected} onToggle={onToggle} />
      </div>
    </div>
  );
}
