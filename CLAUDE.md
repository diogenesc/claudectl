# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is claudectl

A CLI tool that intercepts Claude Code's `PermissionRequest` hook to centralize permission management across multiple Claude sessions. Instead of approving permissions in each session individually, a single TUI (`claudectl attend`) handles all pending requests from one terminal.

## Build and Development

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Watch mode (tsc --watch)
npm test             # Run all tests (requires build first: npm run build && npm test)
```

Tests use Node's built-in test runner (`node --test`). Test files live in `src/test/` and run from compiled `dist/**/*.test.js`.

To run a single test: `node --test dist/test/<name>.test.js`

## Architecture

### Permission Flow

1. Claude Code fires `PermissionRequest` hook -> invokes `claudectl hook-handler`
2. `hook-handler` reads JSON from stdin, writes `~/.claudectl/queue/<uuid>.request.json`, polls for a matching `.response.json` every 500ms
3. User runs `claudectl attend` (TUI) in a separate terminal, sees pending requests, presses (a)llow/(d)eny/(r)emember
4. TUI writes `<uuid>.response.json` (atomic: write tmp, rename), hook-handler picks it up and outputs the decision to stdout
5. Both files are cleaned up after the decision is consumed

### Key Modules

- **`cli.ts`** — Commander-based entry point. All subcommands use dynamic imports.
- **`hook-handler.ts`** — The stdin->queue->poll->stdout bridge invoked by Claude Code's hook system. Not user-facing.
- **`attend.ts`** — Interactive TUI that polls the queue directory and renders a selectable list with keyboard controls (vim-style j/k navigation).
- **`remember.ts`** — Writes to Claude Code's native `~/.claude/settings.json` `permissions.allow` array so future identical tool calls auto-approve without hitting the hook.
- **`sessions.ts`** — Discovers active Claude sessions from `~/.claude/sessions/*.json` by checking if the PID is still alive and its command line contains "claude".
- **`setup.ts`** — Adds the `PermissionRequest` hook config to `~/.claude/settings.json`.

### File Locations

- Queue: `~/.claudectl/queue/` (request/response JSON files)
- Claude settings: `~/.claude/settings.json` (hook config + permissions)
- Claude sessions: `~/.claude/sessions/*.json`

### Design Decisions

- **File-based queue over HTTP/sockets** — No daemon to manage, survives TUI restarts, inspectable with `ls`/`cat`.
- **Native permissions over custom rules** — "Remember" writes directly to Claude Code's `permissions.allow`, so there's a single source of truth and zero overhead for already-approved tools.
- **Session resume delegates to `claude --resume`** — Avoids reimplementing Claude's conversation protocol.
