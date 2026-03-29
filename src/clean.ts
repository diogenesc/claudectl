import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { discoverSessions } from "./sessions.js";
import { CLAUDE_SESSIONS_DIR } from "./paths.js";

export function cleanStaleSessions(): void {
  const sessions = discoverSessions();
  const stale = sessions.filter((s) => s.status === "stale");

  if (stale.length === 0) {
    console.log("No stale sessions to clean.");
    return;
  }

  for (const s of stale) {
    try {
      unlinkSync(join(CLAUDE_SESSIONS_DIR, `${s.pid}.json`));
    } catch {
      // Already gone
    }
  }

  console.log(`Cleaned ${stale.length} stale session file${stale.length === 1 ? "" : "s"}.`);
}
