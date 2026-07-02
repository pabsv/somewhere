"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import FavoriteCitiesPicker from "@/components/settings/FavoriteCitiesPicker";
import { ORIGINS } from "@/data/airports.gen";
import { getPreferences, putPreferences, ApiError } from "@/lib/client";
import type { Preferences } from "@/types/api";

type Mode = "loading" | "ready" | "error";

export default function PreferencesCard() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [mode, setMode] = useState<Mode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  // ─── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setMode("loading");
    getPreferences()
      .then((p) => {
        if (cancelled) return;
        setPrefs(p);
        setMode("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setLoadError("Sign in to continue.");
        } else {
          setLoadError(
            e instanceof Error ? e.message : "Could not load your preferences.",
          );
        }
        setMode("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback((partial: Partial<Preferences>) => {
    setPrefs((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const toggleOrigin = useCallback(
    (code: string) => {
      if (!prefs) return;
      const has = prefs.origins.includes(code);
      patch({
        origins: has
          ? prefs.origins.filter((c) => c !== code)
          : [...prefs.origins, code],
      });
    },
    [prefs, patch],
  );

  // ─── Save ────────────────────────────────────────────────────────────────────
  // Only departure airports are edited here now; trip length / stops / price
  // ceiling were dropped from the UI. We still send the full Preferences shape
  // (hidden fields preserved as loaded) so the API contract is unchanged — the
  // route also merges over the stored subdoc as a backstop.
  const onSave = useCallback(() => {
    if (!prefs) return;
    setSaving(true);
    setSaveMsg(null);

    putPreferences(prefs)
      .then((p) => {
        setPrefs(p);
        setSaveMsg({ kind: "ok", text: "Saved ✓" });
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setSaveMsg({ kind: "err", text: "Sign in to save." });
        } else {
          setSaveMsg({
            kind: "err",
            text: e instanceof Error ? e.message : "Could not save.",
          });
        }
      })
      .finally(() => setSaving(false));
  }, [prefs]);

  useEffect(() => {
    if (saveMsg?.kind !== "ok") return;
    const t = setTimeout(() => setSaveMsg(null), 2000);
    return () => clearTimeout(t);
  }, [saveMsg]);

  // ─── Render gates ──────────────────────────────────────────────────────────
  if (mode === "error") {
    return (
      <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted">
        {loadError}
      </div>
    );
  }
  if (mode === "loading" || !prefs) {
    return <PreferencesSkeleton />;
  }

  return (
    <div className="space-y-7">
      {/* origins */}
      <Field label="Departure airports" hint="Where you'd fly out from.">
        <div className="flex flex-wrap gap-2">
          {ORIGINS.map((o) => (
            <Chip
              key={o.code}
              size="sm"
              selected={prefs.origins.includes(o.code)}
              onClick={() => toggleOrigin(o.code)}
              title={o.name}
            >
              <span className="tnum font-mono uppercase tracking-wide">
                {o.code}
              </span>
            </Chip>
          ))}
        </div>

        {/* save — applies to the airport selection above */}
        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
          >
            {saving ? "Saving…" : "Save airports"}
          </Button>
          {saveMsg && (
            <span
              className={`text-sm transition-opacity ${
                saveMsg.kind === "ok" ? "text-steal" : "text-alert"
              }`}
            >
              {saveMsg.text}
            </span>
          )}
        </div>
      </Field>

      {/* favourite cities — self-persisting, shared with Explore */}
      <div className="border-t border-line pt-7">
        <FavoriteCitiesPicker />
      </div>
    </div>
  );
}

// ─── Small presentational helpers ────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="font-mono text-xs uppercase tracking-wide text-ink-muted">
          {label}
        </h3>
        {hint && <p className="mt-0.5 text-sm text-ink-muted/80">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function PreferencesSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-7">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i}>
          <div className="mb-2 h-3 w-32 animate-pulse rounded bg-line" />
          <div className="h-8 w-48 animate-pulse rounded-(--radius-tag) bg-line" />
        </div>
      ))}
    </div>
  );
}
