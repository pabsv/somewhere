"use client";

import { useState, useEffect, useRef } from "react";
import {
  getAdminUsers,
  AdminUser,
  clearAllData,
  clearAllUsers,
  getScheduleStatus,
  OriginScheduleState,
} from "@/lib/api";
import Button from "@/components/ui/Button";

// ─── Schedule timeline ────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  idle:    "#a3a3a3",
  running: "#3b82f6",
  done:    "#22c55e",
  error:   "#ef4444",
};

function ScheduleTimeline({
  states,
  periodMinutes,
  now,
}: {
  states: OriginScheduleState[];
  periodMinutes: number;
  now: number;
}) {
  const valid = states.filter((s) => s.next_run_at);
  if (!valid.length) return null;

  const periodMs = periodMinutes * 60_000;

  // Determine whether any origin has ever run.
  // If none have run yet (all idle, no last_run_at) we show the UPCOMING cycle
  // anchored to min(next_run_at) so "now" starts at the left edge and origins
  // are at their scheduled positions going forward.
  // Once at least one run has happened we show the CURRENT cycle anchored to
  // min(next_run_at) - period (i.e. when the first origin last ran).
  const anyHasRun = valid.some((s) => s.last_run_at !== null);

  const cycleStart = anyHasRun
    ? Math.min(...valid.map((s) => +new Date(s.next_run_at!) - periodMs))  // current cycle
    : Math.min(...valid.map((s) => +new Date(s.next_run_at!)));             // upcoming cycle

  const cycleEnd = cycleStart + periodMs;

  const toPct = (ms: number) =>
    Math.max(0, Math.min(100, ((ms - cycleStart) / periodMs) * 100));

  const nowPct = toPct(now);

  // Origin position: where they ran (or are scheduled to run) in the displayed cycle.
  // For the upcoming cycle view, use next_run_at directly.
  // For the current cycle view, use next_run_at - period (= time of last run).
  const originPct = (s: OriginScheduleState) =>
    anyHasRun
      ? toPct(+new Date(s.next_run_at!) - periodMs)
      : toPct(+new Date(s.next_run_at!));

  const fmtTime = (ms: number) =>
    new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  // Tick marks — 5 interior ticks (6 equal segments)
  const numSegments = 6;
  const tickMs = periodMs / numSegments;
  const ticks = Array.from({ length: numSegments - 1 }, (_, i) => ({
    ms:   cycleStart + tickMs * (i + 1),
    pct:  toPct(cycleStart + tickMs * (i + 1)),
    show: i % 2 === 1,   // label every other tick to avoid crowding
  }));

  // Origin positions — scheduled time within this cycle
  const origins = valid.map((s) => ({
    origin: s.origin,
    status: s.status,
    pct:    originPct(s),
    color:  STATUS_COLOR[s.status] ?? STATUS_COLOR.idle,
  }));

  // Layout constants (px)
  const LABEL_TOP  = 0;
  const LINE_TOP   = 16;   // line starts just below label
  const BAR_TOP    = 22;
  const BAR_H      = 8;
  const LINE_BOT   = BAR_TOP + BAR_H + 4;  // line ends 4px below bar
  const NOW_TOP    = BAR_TOP - 4;           // cursor slightly taller than bar
  const NOW_H      = BAR_H + 8;
  const TIME_TOP   = BAR_TOP + BAR_H + 8;
  const TOTAL_H    = TIME_TOP + 14;

  return (
    <div className="relative select-none" style={{ height: TOTAL_H }}>

      {/* ── Bar track ── */}
      <div
        className="absolute inset-x-0"
        style={{
          top: BAR_TOP,
          height: BAR_H,
          background: "#f5f5f5",
          border: "1px solid #e5e5e5",
          borderRadius: 3,
          zIndex: 1,
        }}
      >
        {/* Elapsed fill */}
        <div
          style={{
            width: `${nowPct}%`,
            height: "100%",
            background: "#e5e5e5",
            borderRadius: "3px 0 0 3px",
          }}
        />
      </div>

      {/* ── Interior tick marks ── */}
      {ticks.map((t) => (
        <div key={t.ms}>
          {/* tick line on bar */}
          <div
            className="absolute"
            style={{
              left: `${t.pct}%`,
              top: BAR_TOP + 1,
              width: 1,
              height: BAR_H - 2,
              background: "#d4d4d4",
              transform: "translateX(-50%)",
              zIndex: 2,
            }}
          />
          {/* tick time label */}
          {t.show && (
            <div
              className="absolute"
              style={{
                left: `${t.pct}%`,
                top: TIME_TOP,
                fontSize: 9,
                color: "#a3a3a3",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                zIndex: 2,
              }}
            >
              {fmtTime(t.ms)}
            </div>
          )}
        </div>
      ))}

      {/* ── Origin markers ── */}
      {origins.map((o) => (
        <div key={o.origin}>
          {/* Label */}
          <div
            className="absolute"
            style={{
              left: `${o.pct}%`,
              top: LABEL_TOP,
              transform: "translateX(-50%)",
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: 700,
              color: o.color,
              whiteSpace: "nowrap",
              textAlign: "center",
              zIndex: 4,
              opacity: o.status === "idle" ? 0.6 : 1,
            }}
          >
            {o.origin}
          </div>
          {/* Vertical line through the bar */}
          <div
            className={o.status === "running" ? "animate-pulse" : undefined}
            style={{
              position: "absolute",
              left: `${o.pct}%`,
              top: LINE_TOP,
              width: 2,
              height: LINE_BOT - LINE_TOP,
              background: o.color,
              transform: "translateX(-50%)",
              zIndex: 3,
              opacity: o.status === "idle" ? 0.6 : 1,
            }}
          />
        </div>
      ))}

      {/* ── "Now" cursor ── */}
      {nowPct >= 0 && nowPct <= 100 && (
        <div
          className="absolute"
          style={{
            left: `${nowPct}%`,
            top: NOW_TOP,
            width: 2,
            height: NOW_H,
            background: "#171717",
            transform: "translateX(-50%)",
            zIndex: 5,
          }}
        />
      )}

      {/* ── Start / end time labels ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: TIME_TOP,
          fontSize: 9,
          color: "#a3a3a3",
        }}
      >
        {fmtTime(cycleStart)}
      </div>
      <div
        style={{
          position: "absolute",
          right: 0,
          top: TIME_TOP,
          fontSize: 9,
          color: "#a3a3a3",
        }}
      >
        {fmtTime(cycleEnd)}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function timeUntil(iso: string | null, now: number): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "soon";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function StatusBadge({ status }: { status: OriginScheduleState["status"] }) {
  const styles: Record<string, string> = {
    idle:    "bg-neutral-100 text-neutral-400",
    running: "bg-blue-50 text-blue-600",
    done:    "bg-green-50 text-green-700",
    error:   "bg-red-50 text-red-600",
  };
  return (
    <span className={`text-xs px-2 py-0.5 ${styles[status] ?? styles.idle}`}>
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  // Live clock — drives both the timeline and table countdowns
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Users
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Schedule state
  const [scheduleStates, setScheduleStates] = useState<OriginScheduleState[]>([]);
  const schedulePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear flight data
  const [clearStatus, setClearStatus]   = useState<"idle" | "confirm" | "clearing" | "done">("idle");
  const [clearResult, setClearResult]   = useState<Record<string, number> | null>(null);

  // Clear users
  const [clearUsersStatus, setClearUsersStatus] = useState<"idle" | "confirm" | "clearing" | "done">("idle");
  const [clearUsersResult, setClearUsersResult] = useState<Record<string, number> | null>(null);

  // ─── Load on mount ─────────────────────────────────────────────────────────

  useEffect(() => {
    getAdminUsers()
      .then((d) => { setUsers(d.users); setUsersTotal(d.total); })
      .catch((e) => setUsersError(String(e)));

    getScheduleStatus()
      .then((d) => setScheduleStates(d.states))
      .catch(() => {});
  }, []);

  // ─── Schedule polling (faster while something is running) ─────────────────

  const anyRunning = scheduleStates.some((s) => s.status === "running");

  useEffect(() => {
    const interval = anyRunning ? 3000 : 15000;
    schedulePollingRef.current = setInterval(() => {
      getScheduleStatus().then((d) => setScheduleStates(d.states)).catch(() => {});
    }, interval);
    return () => { if (schedulePollingRef.current) clearInterval(schedulePollingRef.current); };
  }, [anyRunning]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleClear = async () => {
    setClearStatus("clearing");
    setClearResult(null);
    try {
      const res = await clearAllData();
      setClearResult(res.deleted);
      setClearStatus("done");
    } catch {
      setClearStatus("idle");
    }
  };

  const handleClearUsers = async () => {
    setClearUsersStatus("clearing");
    setClearUsersResult(null);
    try {
      const res = await clearAllUsers();
      setClearUsersResult(res.deleted);
      setClearUsersStatus("done");
      // Refresh users table
      setUsers([]);
      setUsersTotal(0);
    } catch {
      setClearUsersStatus("idle");
    }
  };

  // ─── Schedule meta ─────────────────────────────────────────────────────────

  const periodMinutes = scheduleStates[0]?.period_minutes ?? null;
  const modeLabel = periodMinutes === 60
    ? "Simulate — 1 cycle = 60 min  (day compressed to 1 hour)"
    : periodMinutes === 1440
    ? "Production — 1 cycle = 24 h"
    : null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">Admin</h1>
      </div>

      {/* ── Scheduler ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-1">
          Scheduler
        </h2>

        {scheduleStates.length === 0 ? (
          <p className="text-xs text-neutral-400 mt-2">
            Scheduler not running — restart the API to start it.
          </p>
        ) : (
          <>
            {modeLabel && (
              <p className="text-xs text-neutral-400 mb-5">{modeLabel}</p>
            )}

            {/* Timeline */}
            {periodMinutes && (
              <div className="mb-6 px-2">
                <ScheduleTimeline
                  states={scheduleStates}
                  periodMinutes={periodMinutes}
                  now={now}
                />
              </div>
            )}

            {/* Per-origin detail table */}
            <div className="border border-neutral-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Origin</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Last run</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Result</th>
                    <th className="text-left px-4 py-3 font-medium text-neutral-600">Next run</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleStates.map((s, i) => (
                    <tr key={s.origin} className={i < scheduleStates.length - 1 ? "border-b border-neutral-100" : ""}>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-neutral-900">
                        {s.origin}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs">
                        {formatTime(s.last_run_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600">
                        {s.status === "error" ? (
                          <span className="text-red-500">{s.last_error}</span>
                        ) : s.last_result ? (
                          <>
                            {s.last_result.new}↑ {s.last_result.updated}~{" "}
                            <span className="font-medium">{s.last_result.deals} deals</span>
                          </>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {s.status === "running" ? (
                          <span className="text-blue-500">running…</span>
                        ) : (
                          <>
                            <span className="font-mono">{formatTime(s.next_run_at)}</span>
                            {s.next_run_at && (
                              <span className="text-neutral-300 ml-1.5">
                                ({timeUntil(s.next_run_at, now)})
                              </span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Clear data ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
          Data
        </h2>
        <div className="border border-neutral-200 p-6 flex flex-col gap-6">

          {/* Flight data */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">Flight data</p>
            {clearStatus === "idle" && (
              <div className="w-fit">
                <Button onClick={() => setClearStatus("confirm")} variant="secondary">
                  Clear all flight data
                </Button>
              </div>
            )}
            {clearStatus === "confirm" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-600">
                  Delete all flights, price history, and route stats?
                </span>
                <button onClick={handleClear} className="text-sm text-red-600 font-medium hover:text-red-700">
                  Yes, clear
                </button>
                <button onClick={() => setClearStatus("idle")} className="text-sm text-neutral-400 hover:text-neutral-700">
                  Cancel
                </button>
              </div>
            )}
            {clearStatus === "clearing" && (
              <p className="text-xs text-neutral-500">Clearing…</p>
            )}
            {clearStatus === "done" && clearResult && (
              <div className="flex items-center gap-4">
                <p className="text-xs text-neutral-600">
                  Cleared — {clearResult.flights ?? 0} flights,{" "}
                  {clearResult.price_history ?? 0} price history,{" "}
                  {clearResult.route_stats ?? 0} route stats
                </p>
                <button
                  onClick={() => { setClearStatus("idle"); setClearResult(null); }}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Users */}
          <div className="flex flex-col gap-2 pt-4 border-t border-neutral-100">
            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">Users</p>
            {clearUsersStatus === "idle" && (
              <div className="w-fit">
                <Button onClick={() => setClearUsersStatus("confirm")} variant="secondary">
                  Clear all users
                </Button>
              </div>
            )}
            {clearUsersStatus === "confirm" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-600">
                  Delete all users, availability, and destination preferences?
                </span>
                <button onClick={handleClearUsers} className="text-sm text-red-600 font-medium hover:text-red-700">
                  Yes, clear
                </button>
                <button onClick={() => setClearUsersStatus("idle")} className="text-sm text-neutral-400 hover:text-neutral-700">
                  Cancel
                </button>
              </div>
            )}
            {clearUsersStatus === "clearing" && (
              <p className="text-xs text-neutral-500">Clearing…</p>
            )}
            {clearUsersStatus === "done" && clearUsersResult && (
              <div className="flex items-center gap-4">
                <p className="text-xs text-neutral-600">
                  Cleared — {clearUsersResult.users ?? 0} users,{" "}
                  {clearUsersResult.availability ?? 0} availability windows,{" "}
                  {clearUsersResult.destination_preferences ?? 0} destination prefs
                </p>
                <button
                  onClick={() => { setClearUsersStatus("idle"); setClearUsersResult(null); }}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── Users ── */}
      <section>
        <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
          Users{usersTotal > 0 && (
            <span className="font-normal text-neutral-400 normal-case tracking-normal ml-1">
              ({usersTotal})
            </span>
          )}
        </h2>

        {usersError && <p className="text-sm text-red-600 mb-4">{usersError}</p>}

        {users.length === 0 && !usersError ? (
          <p className="text-sm text-neutral-400">No users found.</p>
        ) : (
          <div className="border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Home airport</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Nearby</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Joined</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={i < users.length - 1 ? "border-b border-neutral-100" : ""}>
                    <td className="px-4 py-3 text-neutral-900">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{u.email}</td>
                    <td className="px-4 py-3 text-neutral-600 font-mono text-xs">{u.airports.home || "—"}</td>
                    <td className="px-4 py-3 text-neutral-600 font-mono text-xs">
                      {u.airports.nearby.length > 0 ? u.airports.nearby.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 ${u.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-400"}`}>
                        {u.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
