"use client";

import { useCallback, useState } from "react";
import { adminWipe, ApiError } from "@/lib/client";

type Phase = "idle" | "confirm" | "wiping" | "done" | "error";

/**
 * The only destructive admin action: wipe the flights collection. Two-step
 * inline confirm — first click arms it, a second explicit Confirm fires the
 * request. Nothing else is wipeable by contract.
 */
export default function DangerZone() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<string | null>(null);

  const wipe = useCallback(async () => {
    setPhase("wiping");
    setResult(null);
    try {
      const res = await adminWipe("flights");
      setResult(`Deleted ${res.deleted} flight docs.`);
      setPhase("done");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setResult("Admin only.");
      } else {
        setResult(e instanceof Error ? e.message : "Wipe failed.");
      }
      setPhase("error");
    }
  }, []);

  return (
    <div className="rounded-(--radius-card) border border-alert/40 bg-card p-5 shadow-(--shadow-card)">
      <h2 className="font-display text-lg font-semibold text-ink">
        Danger zone
      </h2>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">
        Wipe every flight document. The scraper repopulates over the next cycle;
        baselines on scrape_targets are untouched.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {phase === "confirm" ? (
          <>
            <span className="text-sm font-medium text-ink">
              Really wipe all flight docs?
            </span>
            <button
              type="button"
              onClick={wipe}
              className="rounded-(--radius-tag) bg-alert px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className="rounded-(--radius-tag) border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={phase === "wiping"}
            onClick={() => {
              setResult(null);
              setPhase("confirm");
            }}
            className="rounded-(--radius-tag) border border-alert px-4 py-2 text-sm font-medium text-alert transition-colors hover:bg-alert hover:text-white disabled:opacity-50"
          >
            {phase === "wiping" ? "Wiping…" : "Wipe flights"}
          </button>
        )}

        {result && (
          <span
            className={`text-sm ${
              phase === "error" ? "text-alert" : "text-steal"
            }`}
          >
            {result}
          </span>
        )}
      </div>
    </div>
  );
}
