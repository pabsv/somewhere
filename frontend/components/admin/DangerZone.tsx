"use client";

import { useCallback, useState } from "react";
import { adminWipe, ApiError } from "@/lib/client";

type Phase = "idle" | "confirm" | "wiping" | "done" | "error";

/** The sole admin mutation, kept behind the existing two-step confirmation. */
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
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        setResult("Admin only.");
      } else {
        setResult(error instanceof Error ? error.message : "Wipe failed.");
      }
      setPhase("error");
    }
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-(--radius-card) border border-alert/35 bg-card px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-wide text-alert">
        Danger
      </span>
      <span className="text-[13px] text-ink-muted">
        Wipe every flight document — the scraper repopulates over the next
        cycle.
      </span>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {phase === "confirm" ? (
          <>
            <span className="text-[13px] font-medium text-ink">
              Really wipe?
            </span>
            <button
              type="button"
              onClick={wipe}
              className="rounded-(--radius-tag) bg-alert px-3.5 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setPhase("idle")}
              className="rounded-(--radius-tag) border border-line bg-transparent px-3.5 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
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
            className="rounded-(--radius-tag) border border-alert bg-transparent px-3.5 py-1.5 text-[13px] font-medium text-alert transition-colors hover:bg-alert hover:text-white disabled:opacity-50"
          >
            {phase === "wiping" ? "Wiping…" : "Wipe flights"}
          </button>
        )}

        {result && (
          <span
            role="status"
            className={`text-[13px] ${
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
