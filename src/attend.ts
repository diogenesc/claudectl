import {
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { ensureQueueDir, QUEUE_DIR } from "./paths.js";
import { rememberPermission } from "./remember.js";

interface QueueRequest {
  id: string;
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  cwd: string;
  project: string;
  timestamp: number;
}

function getPendingRequests(): QueueRequest[] {
  ensureQueueDir();
  const files = readdirSync(QUEUE_DIR);
  const requestFiles = files.filter((f) => f.endsWith(".request.json"));
  const requests: QueueRequest[] = [];

  for (const file of requestFiles) {
    const id = file.replace(".request.json", "");
    const responsePath = join(QUEUE_DIR, `${id}.response.json`);
    if (existsSync(responsePath)) continue;

    try {
      const raw = readFileSync(join(QUEUE_DIR, file), "utf-8");
      requests.push(JSON.parse(raw));
    } catch {
      // Skip corrupt files
    }
  }

  return requests.sort((a, b) => a.timestamp - b.timestamp);
}

function toolInputSummary(req: QueueRequest): string {
  if (req.tool_name === "Bash" && req.tool_input.command) {
    const cmd = String(req.tool_input.command);
    return cmd.length > 60 ? cmd.slice(0, 57) + "..." : cmd;
  }
  if (req.tool_name === "Edit" && req.tool_input.file_path) {
    return String(req.tool_input.file_path);
  }
  if (req.tool_name === "Write" && req.tool_input.file_path) {
    return String(req.tool_input.file_path);
  }
  const keys = Object.keys(req.tool_input);
  if (keys.length > 0) {
    const first = String(req.tool_input[keys[0]]);
    return first.length > 60 ? first.slice(0, 57) + "..." : first;
  }
  return "(no details)";
}

function writeResponseFile(id: string, decision: "allow" | "deny"): void {
  const responsePath = join(QUEUE_DIR, `${id}.response.json`);
  const tmpPath = join(QUEUE_DIR, `${id}.response.tmp`);
  writeFileSync(tmpPath, JSON.stringify({ decision }));
  renameSync(tmpPath, responsePath);
}

function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

function dim(text: string): string {
  return `\x1b[2m${text}\x1b[0m`;
}

function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`;
}

function green(text: string): string {
  return `\x1b[32m${text}\x1b[0m`;
}

function red(text: string): string {
  return `\x1b[31m${text}\x1b[0m`;
}

function yellow(text: string): string {
  return `\x1b[33m${text}\x1b[0m`;
}

function cyan(text: string): string {
  return `\x1b[36m${text}\x1b[0m`;
}

function renderList(requests: QueueRequest[], selected: number): void {
  clearScreen();
  console.log(bold("claudectl attend") + "  —  Pending permission requests\n");

  if (requests.length === 0) {
    console.log(dim("  No pending permissions. Watching for new requests..."));
    console.log();
    console.log(dim("  Press (q) to quit."));
    return;
  }

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    const marker = i === selected ? cyan("▶") : " ";
    const idx = dim(`[${i + 1}]`);
    const project = yellow(req.project.padEnd(16));
    const tool = bold(req.tool_name.padEnd(8));
    const summary = toolInputSummary(req);
    console.log(`  ${marker} ${idx} ${project} ${tool} ${summary}`);
  }

  console.log();
  console.log(
    dim("  ") +
      green("(a)") +
      dim("llow  ") +
      red("(d)") +
      dim("eny  ") +
      dim("(v)iew  ") +
      cyan("(r)") +
      dim("emember  ") +
      green("(A)") +
      dim("ll allow  ") +
      red("(D)") +
      dim("ll deny  ") +
      dim("(q)uit"),
  );
}

function renderDetail(req: QueueRequest): void {
  clearScreen();
  console.log(bold("Request Details\n"));
  console.log(`  ${dim("Session:")}   ${req.session_id}`);
  console.log(`  ${dim("Project:")}   ${req.project}`);
  console.log(`  ${dim("Tool:")}      ${req.tool_name}`);
  console.log(`  ${dim("CWD:")}       ${req.cwd}`);
  console.log(
    `  ${dim("Time:")}      ${new Date(req.timestamp).toLocaleString()}`,
  );
  console.log();
  console.log(`  ${dim("Input:")}`);
  const formatted = JSON.stringify(req.tool_input, null, 2);
  for (const line of formatted.split("\n")) {
    console.log(`    ${line}`);
  }
  console.log();
  console.log(dim("  Press any key to go back."));
}

export async function attend(): Promise<void> {
  ensureQueueDir();

  const rl = createInterface({ input: process.stdin });
  process.stdin.setRawMode(true);

  let selected = 0;
  let requests = getPendingRequests();
  let viewingDetail = false;
  let running = true;

  const refresh = (): void => {
    requests = getPendingRequests();
    if (selected >= requests.length) {
      selected = Math.max(0, requests.length - 1);
    }
    if (!viewingDetail) {
      renderList(requests, selected);
    }
  };

  refresh();

  const pollInterval = setInterval(refresh, 500);

  const cleanup = (): void => {
    running = false;
    clearInterval(pollInterval);
    process.stdin.setRawMode(false);
    rl.close();
    clearScreen();
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });

  for await (const key of process.stdin) {
    if (!running) break;
    const ch = key.toString();

    // Ctrl+C
    if (ch === "\x03") {
      cleanup();
      process.exit(0);
    }

    if (viewingDetail) {
      viewingDetail = false;
      refresh();
      continue;
    }

    if (ch === "q") {
      cleanup();
      return;
    }

    // Arrow keys
    if (ch === "\x1b[A" || ch === "k") {
      // Up
      if (requests.length > 0) {
        selected = (selected - 1 + requests.length) % requests.length;
        renderList(requests, selected);
      }
      continue;
    }
    if (ch === "\x1b[B" || ch === "j") {
      // Down
      if (requests.length > 0) {
        selected = (selected + 1) % requests.length;
        renderList(requests, selected);
      }
      continue;
    }

    if (requests.length === 0) continue;

    const current = requests[selected];

    if (ch === "a" && current) {
      writeResponseFile(current.id, "allow");
      refresh();
    } else if (ch === "d" && current) {
      writeResponseFile(current.id, "deny");
      refresh();
    } else if (ch === "v" && current) {
      viewingDetail = true;
      renderDetail(current);
    } else if (ch === "r" && current) {
      writeResponseFile(current.id, "allow");
      const result = rememberPermission(
        current.tool_name,
        current.tool_input,
        "allow",
      );
      // Flash a message before refresh
      clearScreen();
      if (result.alreadyExists) {
        console.log(dim("  Already remembered."));
      } else {
        console.log(
          green("  ✓") +
            ` Remembered: ${result.permission}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      refresh();
    } else if (ch === "A") {
      for (const req of requests) {
        writeResponseFile(req.id, "allow");
      }
      refresh();
    } else if (ch === "D") {
      for (const req of requests) {
        writeResponseFile(req.id, "deny");
      }
      refresh();
    }
  }
}
