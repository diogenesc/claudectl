import { execFile } from "node:child_process";

let muted = false;

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}

export function notify(): void {
  if (muted) return;

  const customCmd = process.env.CLAUDE_CTL_SOUND_CMD;
  if (customCmd) {
    const parts = customCmd.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    try {
      execFile(cmd, args, (err: Error | null) => {
        if (err) {
          process.stdout.write("\x07");
        }
      });
    } catch {
      process.stdout.write("\x07");
    }
    return;
  }

  process.stdout.write("\x07");
}
