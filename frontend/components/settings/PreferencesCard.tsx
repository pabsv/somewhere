"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { ORIGINS } from "@/data/airports.gen";
import { getPreferences, putPreferences, ApiError } from "@/lib/client";
import type { Preferences } from "@/types/api";

const NIGHT_MIN = 1;
const NIGHT_MAX = 21;

function clampNights(n: number): number {
  if (Number.isNaN(n)) return NIGHT_MIN;
  return Math.min(NIGHT_MAX, Math.max(NIGHT_MIN, Math.round(n)));
}

type Mode = "loading" | "ready" | "error";

export default function PreferencesCard() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [mode, setMode] = useState<Mode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  // local raw text for the optional max-price field (empty = null)
  const [maxPriceText, setMaxPriceText] = useState("");

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
        setMaxPriceText(p.max_price != null ? String(p.max_price) : "");
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

  // ─── Field mutators ──────────────────────────────────────────────────────────
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

  const setMin = useCallback(
    (raw: string) => {
      if (!prefs) return;
      const v = clampNights(Number(raw));
      // keep min <= max
      patch({ trip_min_nights: v, trip_max_nights: Math.max(v, prefs.trip_max_nights) });
    },
    [prefs, patch],
  );

  const setMax = useCallback(
    (raw: string) => {
      if (!prefs) return;
      const v = clampNights(Number(raw));
      patch({ trip_max_nights: v, trip_min_nights: Math.min(v, prefs.trip_min_nights) });
    },
    [prefs, patch],
  );

  const onMaxPriceChange = useCallback((raw: string) => {
    // keep only digits; empty string allowed (= no cap)
    const cleaned = raw.replace(/[^\d]/g, "");
    setMaxPriceText(cleaned);
  }, []);

  // ─── Save ────────────────────────────────────────────────────────────────────
  const onSave = useCallback(() => {
    if (!prefs) return;
    setSaving(true);
    setSaveMsg(null);
    const max_price = maxPriceText.trim() === "" ? null : Number(maxPriceText);
    const payload: Preferences = { ...prefs, max_price };

    putPreferences(payload)
      .then((p) => {
        setPrefs(p);
        setMaxPriceText(p.max_price != null ? String(p.max_price) : "");
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
  }, [prefs, maxPriceText]);

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
      <Field
        label="Departure airports"
        hint="Where you'd fly out from."
      >
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
      </Field>

      {/* trip length */}
      <Field label="Trip length" hint="How many nights away, roughly.">
        <div className="flex flex-wrap items-end gap-4">
          <NightInput
            id="min-nights"
            label="Min nights"
            value={prefs.trip_min_nights}
            onChange={setMin}
          />
          <span className="pb-2 text-ink-muted">–</span>
          <NightInput
            id="max-nights"
            label="Max nights"
            value={prefs.trip_max_nights}
            onChange={setMax}
          />
        </div>
      </Field>

      {/* direct only */}
      <Field label="Stops" hint="Skip connections entirely.">
        <Chip
          size="sm"
          selected={prefs.direct_only}
          onClick={() => patch({ direct_only: !prefs.direct_only })}
          aria-label="Toggle direct flights only"
        >
          Direct flights only
        </Chip>
      </Field>

      {/* max price */}
      <Field label="Price ceiling" hint="Leave empty for no cap.">
        <div className="relative w-32">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted">
            €
          </span>
          <input
            id="max-price"
            inputMode="numeric"
            value={maxPriceText}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            placeholder="—"
            aria-label="Maximum price in euros"
            className="tnum w-full rounded-(--radius-tag) border border-line bg-card py-2 pl-7 pr-3 font-mono text-sm text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none"
          />
        </div>
      </Field>

      {/* save */}
      <div className="flex items-center gap-3 border-t border-line pt-5">
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
        >
          {saving ? "Saving…" : "Save preferences"}
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

function NightInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (raw: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wide text-ink-muted/80">
        {label}
      </span>
      <input
        id={id}
        type="number"
        min={NIGHT_MIN}
        max={NIGHT_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tnum w-20 rounded-(--radius-tag) border border-line bg-card px-3 py-2 text-center font-mono text-sm text-ink focus:border-ink-muted focus:outline-none"
      />
    </label>
  );
}

function PreferencesSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-7">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i}>
          <div className="mb-2 h-3 w-32 animate-pulse rounded bg-line" />
          <div className="h-8 w-48 animate-pulse rounded-(--radius-tag) bg-line" />
        </div>
      ))}
    </div>
  );
}
