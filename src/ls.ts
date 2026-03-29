import Table from "cli-table3";
import { discoverSessions } from "./sessions.js";

export function listSessions(opts: {
  all: boolean;
  json: boolean;
}): void {
  const sessions = discoverSessions();
  const filtered = opts.all
    ? sessions
    : sessions.filter((s) => s.status === "active");

  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  if (filtered.length === 0) {
    console.log("No active Claude Code sessions found.");
    return;
  }

  const table = new Table({
    head: ["STATUS", "SESSION", "PID", "PROJECT", "STARTED", "KIND"],
    style: { head: ["cyan"] },
  });

  for (const s of filtered) {
    const status = s.status === "active" ? "\x1b[32m●\x1b[0m active" : "\x1b[2m○ stale\x1b[0m";
    const sessionShort = s.sessionId.slice(0, 8);
    const started = s.startedAt
      ? new Date(s.startedAt).toLocaleString()
      : "—";

    table.push([status, sessionShort, s.pid, s.project, started, s.kind]);
  }

  console.log(table.toString());
}
