import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { ensureQueueDir, QUEUE_DIR } from "./paths.js";

interface HookInput {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  cwd: string;
}

interface QueueRequest {
  id: string;
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  cwd: string;
  project: string;
  timestamp: number;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    process.stdin.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString()));
    process.stdin.on("error", reject);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeResponse(decision: "allow" | "deny"): void {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: { behavior: decision },
    },
  };
  process.stdout.write(JSON.stringify(output));
}

export async function hookHandler(): Promise<void> {
  let input: HookInput;
  try {
    const raw = await readStdin();
    input = JSON.parse(raw);
    if (!input.session_id || !input.tool_name || !input.tool_input) {
      throw new Error("Missing required fields");
    }
  } catch (err) {
    process.stderr.write(
      `claudectl: failed to parse hook input: ${err}\n`,
    );
    process.exit(1);
  }

  ensureQueueDir();

  const id = randomUUID();
  const requestPath = join(QUEUE_DIR, `${id}.request.json`);
  const responsePath = join(QUEUE_DIR, `${id}.response.json`);

  const request: QueueRequest = {
    id,
    session_id: input.session_id,
    tool_name: input.tool_name,
    tool_input: input.tool_input,
    cwd: input.cwd,
    project: basename(input.cwd),
    timestamp: Date.now(),
  };

  writeFileSync(requestPath, JSON.stringify(request, null, 2));

  // Poll for response
  try {
    while (true) {
      await sleep(500);

      if (existsSync(responsePath)) {
        const raw = readFileSync(responsePath, "utf-8");
        const response = JSON.parse(raw);
        const decision =
          response.decision === "deny" ? "deny" : "allow";

        // Clean up
        try {
          unlinkSync(requestPath);
        } catch {}
        try {
          unlinkSync(responsePath);
        } catch {}

        writeResponse(decision as "allow" | "deny");
        return;
      }
    }
  } catch (err) {
    // Clean up on unexpected error
    try {
      unlinkSync(requestPath);
    } catch {}
    process.stderr.write(`claudectl: hook-handler error: ${err}\n`);
    process.exit(1);
  }
}
