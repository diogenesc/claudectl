import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, "..", "cli.js");

describe("hook-handler", () => {
  let queueDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    const tmpBase = mkdtempSync(join(tmpdir(), "claudectl-test-"));
    queueDir = join(tmpBase, ".claudectl", "queue");
    originalHome = process.env.HOME;
    // We'll use the env var to override for tests
  });

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  it("should reject invalid stdin", () => {
    try {
      execSync(`echo 'not json' | node ${CLI_PATH} hook-handler`, {
        encoding: "utf-8",
        timeout: 5000,
        env: { ...process.env },
      });
      assert.fail("Should have exited with error");
    } catch (err: unknown) {
      const error = err as { status: number; stderr: string };
      assert.equal(error.status, 1);
      assert.ok(error.stderr.includes("failed to parse"));
    }
  });

  it("should reject empty stdin", () => {
    try {
      execSync(`echo '' | node ${CLI_PATH} hook-handler`, {
        encoding: "utf-8",
        timeout: 5000,
      });
      assert.fail("Should have exited with error");
    } catch (err: unknown) {
      const error = err as { status: number; stderr: string };
      assert.equal(error.status, 1);
    }
  });

  it("should create a request file in the queue", () => {
    const input = JSON.stringify({
      session_id: "test-sess",
      tool_name: "Bash",
      tool_input: { command: "echo hello" },
      cwd: "/tmp/project",
    });

    const queuePath = join(
      process.env.HOME || "",
      ".claudectl",
      "queue",
    );

    // Snapshot existing files before running hook-handler
    const filesBefore = new Set(
      existsSync(queuePath)
        ? readdirSync(queuePath).filter((f) => f.endsWith(".request.json"))
        : [],
    );

    // Run hook-handler with a short timeout so it creates the file then dies
    try {
      execSync(`echo '${input}' | timeout 2 node ${CLI_PATH} hook-handler`, {
        encoding: "utf-8",
        timeout: 5000,
      });
    } catch {
      // Expected: timeout kills it while polling
    }

    if (existsSync(queuePath)) {
      const filesAfter = readdirSync(queuePath).filter((f) =>
        f.endsWith(".request.json"),
      );
      // Find only the newly created file(s)
      const newFiles = filesAfter.filter((f) => !filesBefore.has(f));

      assert.ok(newFiles.length > 0, "Should have created a new request file");

      const request = JSON.parse(
        readFileSync(join(queuePath, newFiles[0]), "utf-8"),
      );
      assert.equal(request.tool_name, "Bash");
      assert.equal(request.session_id, "test-sess");
      assert.equal(request.project, "project");

      // Cleanup only our files
      for (const f of newFiles) {
        rmSync(join(queuePath, f));
      }
    }
  });
});
