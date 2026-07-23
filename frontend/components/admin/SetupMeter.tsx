import type { AdminUser } from "@/types/api";

export interface SetupCheck {
  key: "onboarded" | "availability" | "favourites" | "social";
  label: string;
  done: boolean;
  detail: string;
}

export function setupChecks(user: AdminUser): SetupCheck[] {
  const socialCount = user.friend_count + user.groups.length;
  return [
    {
      key: "onboarded",
      label: "Onboarding",
      done: user.onboarded,
      detail: user.onboarded ? "finished" : "still pending",
    },
    {
      key: "availability",
      label: "Availability",
      done: user.availability_window_count > 0,
      detail: `${user.availability_window_count} ${
        user.availability_window_count === 1 ? "window" : "windows"
      }`,
    },
    {
      key: "favourites",
      label: "Favourites",
      done: user.saved_cities.length > 0,
      detail: `${user.saved_cities.length} ${
        user.saved_cities.length === 1 ? "city" : "cities"
      }`,
    },
    {
      key: "social",
      label: "Social",
      done: socialCount > 0,
      detail: `${user.friend_count} ${
        user.friend_count === 1 ? "friend" : "friends"
      } · ${user.groups.length} ${user.groups.length === 1 ? "group" : "groups"}`,
    },
  ];
}

export function setupScore(user: AdminUser): number {
  return setupChecks(user).filter((item) => item.done).length;
}

export function setupState(user: AdminUser): "set-up" | "partial" | "not-started" {
  const score = setupScore(user);
  if (score === 4) return "set-up";
  if (score === 0) return "not-started";
  return "partial";
}

export default function SetupMeter({
  user,
  size = 10,
  showScore = false,
  className = "",
}: {
  user: AdminUser;
  size?: number;
  showScore?: boolean;
  className?: string;
}) {
  const checks = setupChecks(user);
  const score = checks.filter((item) => item.done).length;
  const title = checks
    .map((item) => `${item.done ? "✓" : "✕"} ${item.label.toLowerCase()}`)
    .join(" · ");

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 ${className}`}
      title={title}
      aria-label={`${score} of 4 setup steps complete. ${title}`}
    >
      <span className="inline-flex gap-[3px]" aria-hidden="true">
        {checks.map((item) => (
          <span
            key={item.key}
            className={`rounded-[3px] ${item.done ? "bg-steal" : "bg-line"}`}
            style={{ width: size, height: size }}
          />
        ))}
      </span>
      {showScore && (
        <span className="tnum font-mono text-[11px] text-ink-muted">
          {score}/4
        </span>
      )}
    </span>
  );
}
