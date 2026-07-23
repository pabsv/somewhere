"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Chip from "@/components/ui/Chip";
import OriginChips from "@/components/settings/OriginChips";
import { getPreferences, putPreferences, ApiError } from "@/lib/client";
import { useUniCalendar } from "@/lib/university/context";
import type { Preferences } from "@/types/api";

type Mode = "loading" | "ready" | "error";

export default function PreferencesCard() {
  const { setUniversity } = useUniCalendar();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [mode, setMode] = useState<Mode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lastSyncedRef = useRef<string | null>(null);
  const saveVersionRef = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [saveMsg, setSaveMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPreferences()
      .then((p) => {
        if (cancelled) return;
        lastSyncedRef.current = JSON.stringify(p);
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

  // Preferences autosave after a short quiet period. Writes are serialized
  // because the endpoint replaces the full preferences object.
  useEffect(() => {
    if (mode !== "ready" || !prefs || lastSyncedRef.current === null) return;
    const serialized = JSON.stringify(prefs);
    if (serialized === lastSyncedRef.current) return;

    const snapshot = prefs;
    const timeout = setTimeout(() => {
      const version = ++saveVersionRef.current;
      setSaving(true);
      setSaveMsg(null);
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() => putPreferences(snapshot))
        .then((savedPrefs) => {
          if (version !== saveVersionRef.current) return;
          lastSyncedRef.current = JSON.stringify(savedPrefs);
          setUniversity(savedPrefs.university ?? null);
          setSaveMsg({ kind: "ok", text: "Saved ✓" });
        })
        .catch((e) => {
          if (version !== saveVersionRef.current) return;
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            setSaveMsg({ kind: "err", text: "Sign in to save." });
          } else {
            setSaveMsg({
              kind: "err",
              text: e instanceof Error ? e.message : "Could not save.",
            });
          }
        })
        .finally(() => {
          if (version === saveVersionRef.current) setSaving(false);
        });
    }, 450);

    return () => clearTimeout(timeout);
  }, [prefs, mode, setUniversity]);

  useEffect(() => {
    if (saveMsg?.kind !== "ok") return;
    const timeout = setTimeout(() => setSaveMsg(null), 2000);
    return () => clearTimeout(timeout);
  }, [saveMsg]);

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
      <Field label="Departure airports" hint="Where you'd fly out from.">
        <OriginChips selected={prefs.origins} onToggle={toggleOrigin} />
      </Field>

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

      {(saving || saveMsg) && (
        <div className="text-sm text-ink-muted" aria-live="polite">
          {saving ? (
            <span>Saving changes…</span>
          ) : (
            <span
              className={`transition-opacity ${
                saveMsg?.kind === "ok" ? "text-steal" : "text-alert"
              }`}
            >
              {saveMsg?.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
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
