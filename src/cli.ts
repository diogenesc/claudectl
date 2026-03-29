#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);

const program = new Command();

program
  .name("claudectl")
  .description("Centralized permission management for Claude Code sessions")
  .version(pkg.version);

program
  .command("hook-handler")
  .description("Handle PermissionRequest hook from Claude Code (not user-facing)")
  .action(async () => {
    const { hookHandler } = await import("./hook-handler.js");
    await hookHandler();
  });

program
  .command("attend")
  .description("Launch the unified TUI (alias for default command)")
  .action(async () => {
    const { launchTui } = await import("./tui.js");
    await launchTui();
  });

program
  .command("ls")
  .description("List all active Claude Code sessions")
  .option("-a, --all", "Include stale sessions", false)
  .option("--json", "Output as JSON", false)
  .action(async (opts) => {
    const { listSessions } = await import("./ls.js");
    listSessions(opts);
  });

program
  .command("resume [selector]")
  .description("Resume a Claude Code session by ID prefix, PID, or project name")
  .action(async (selector?: string) => {
    const { resumeSession } = await import("./resume.js");
    await resumeSession(selector);
  });

program
  .command("clean")
  .description("Remove stale session files from dead processes")
  .action(async () => {
    const { cleanStaleSessions } = await import("./clean.js");
    cleanStaleSessions();
  });

program
  .command("setup")
  .description("Configure Claude Code to use claudectl for permission handling")
  .action(async () => {
    const { setup } = await import("./setup.js");
    await setup();
  });

// Default action: launch TUI if no subcommand given
program.action(async () => {
  const { launchTui } = await import("./tui.js");
  await launchTui();
});

program.parse();
