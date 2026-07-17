"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { ORIGINS } from "@/data/airports.gen";
import { getPreferences, putPreferences, ApiError } from "@/lib/client";
import { useUniCalendar } from "@/lib/university/context";
import type { Preferences } from "@/types/api";

type Mode = "loading" | "ready" | "error";

export default function PreferencesCard() {
  const { setUniversity } = useUniCalendar();
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
        // sync the shared overlay state (YearPaint on this page, calendars)
        setUniversity(p.university ?? null);
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
  }, [prefs, maxPriceText, setUniversity]);

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

      {/* university calendar */}
      <Field
        label="University calendar"
        hint="Show TU/e exam periods and holidays on your calendars."
      >
        <Chip
          size="sm"
          selected={prefs.university === "tue"}
          onClick={() =>
            patch({ university: prefs.university === "tue" ? null : "tue" })
          }
        >
          I&rsquo;m a TU/e student
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

function PreferencesSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-7">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i}>
          <div className="mb-2 h-3 w-32 animate-pulse rounded bg-line" />
          <div className="h-8 w-48 animate-pulse rounded-(--radius-tag) bg-line" />
        </div>
      ))}
    </div>
  );
}
