"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import OriginChips from "@/components/settings/OriginChips";
import { getPreferences, putPreferences, ApiError } from "@/lib/client";
import type { Preferences } from "@/types/api";

type Mode = "loading" | "ready" | "error";

export default function PreferencesCard() {
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
        .then(() => putPreferences({ origins: snapshot.origins }))
        .then((savedPrefs) => {
          if (version !== saveVersionRef.current) return;
          lastSyncedRef.current = JSON.stringify(savedPrefs);
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
  }, [prefs, mode]);

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
    <div className="space-y-3">
      <Field label="Departure airports" hint="Where you'd fly out from.">
        <OriginChips selected={prefs.origins} onToggle={toggleOrigin} />
      </Field>

      {saveMsg?.kind === "err" && !saving && (
        <div className="text-sm text-alert" aria-live="polite">
          {saveMsg.text}
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
    <div aria-hidden="true">
      <div className="mb-2 h-3 w-32 animate-pulse rounded bg-line" />
      <div className="h-8 w-64 animate-pulse rounded-(--radius-tag) bg-line" />
    </div>
  );
}
