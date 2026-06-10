import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { getDb } from "@/lib/mongodb";

// POST /api/admin/scrape         → run all origins once (test mode)
// POST /api/admin/scrape?origin=EIN → run single origin once
//
// Spawns a detached `python -m scheduler.scheduler --test [ORIGIN]` process
// in the project root. The Python process writes progress to the
// `schedule_state` MongoDB collection, which the admin page polls.
//
// Dev-only: relies on Node's child_process.spawn, which is unavailable in
// Vercel serverless runtimes.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const originParam = searchParams.get("origin");
  const origin = originParam ? originParam.toUpperCase() : null;

  // Guard: refuse if any origin is already running
  const db = await getDb();
  const running = await db.collection("schedule_state").findOne({ status: "running" });
  if (running) {
    return NextResponse.json(
      { error: `Scrape already running for ${running.origin}` },
      { status: 409 }
    );
  }

  // Project root = parent of `frontend/`
  const projectRoot = path.resolve(process.cwd(), "..");
  const args = ["-m", "scheduler.scheduler", "--test"];
  if (origin) args.push(origin);

  let child;
  try {
    child = spawn("python", args, {
      cwd: projectRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to spawn scraper: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    pid: child.pid,
    origin: origin ?? "ALL",
  });
}
