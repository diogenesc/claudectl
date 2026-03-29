# claudectl

Centralized permission management for Claude Code sessions. Instead of approving permissions in each Claude Code session individually, a single TUI handles all pending requests from one terminal.

```
┌─[Sessions]──[Permissions(3)]─────────────────────────────┐
│                                                           │
│  ▶ my-app (pid 12345)        │  Tool:     Bash           │
│    backend (pid 12346)       │  Session:  abc123          │
│    frontend (pid 12347)      │  Project:  my-app          │
│                              │  CWD:      ~/code/my-app   │
│                              │                            │
│                              │  Input:                    │
│                              │  {                         │
│                              │    "command": "npm test"   │
│                              │  }                         │
├──────────────────────────────┤                            │
│  [a]llow [d]eny [r]emember [Tab] switch [q]uit      🔔  │
└──────────────────────────────┴────────────────────────────┘
```

## Features

- **Unified TUI** — Sessions and permissions in one interface with tab switching
- **Sound notifications** — Audible alert when new permission requests arrive
- **Full request display** — See the complete tool input (no truncation) with syntax-highlighted JSON
- **Session switching** — View active Claude sessions and resume any of them with Enter
- **Remember permissions** — Save allow rules to Claude Code's native `settings.json` for auto-approval
- **Scriptable CLI** — All functionality also available as individual subcommands

## Installation

### From source

```bash
git clone <repo-url>
cd claudectl
npm install
npm run build
npm link
```

After `npm link`, both `claudectl` and the shorthand `cctl` are available globally.

### From npm

```bash
npm install -g @diogenesc/claudectl
```

### Verify installation

```bash
claudectl --version
# or
cctl --version
```

## Setup

Configure Claude Code to route permission requests through claudectl:

```bash
claudectl setup
```

This adds a `PermissionRequest` hook to `~/.claude/settings.json` that invokes `claudectl hook-handler` whenever Claude Code needs permission for a tool call.

## Usage

### Launch the TUI

```bash
claudectl
```

That's it. No subcommand needed. The TUI opens with two tabs:

- **Sessions** — Lists all active Claude Code sessions
- **Permissions** — Shows pending permission requests from all sessions

### Keyboard Controls

#### Global

| Key       | Action                              |
|-----------|-------------------------------------|
| `Tab`     | Switch between Sessions/Permissions |
| `j` / `↓` | Move selection down                |
| `k` / `↑` | Move selection up                  |
| `J` (Shift+J) | Scroll detail pane down        |
| `K` (Shift+K) | Scroll detail pane up          |
| `m`       | Toggle sound mute                   |
| `q`       | Quit                                |
| `Ctrl+C`  | Quit                                |

#### Permissions Tab

**One-time decisions** (affect only the selected request):

| Key | Action                                |
|-----|---------------------------------------|
| `a` | Allow this request                    |
| `d` | Deny this request                     |

**Permanent rules** (save to Claude Code settings — never ask again for matching tool calls):

| Key | Action                                                        |
|-----|---------------------------------------------------------------|
| `r` | Allow this request and always allow matching ones in the future |
| `R` | Deny this request and always deny matching ones in the future   |

**Batch actions** (apply a one-time decision to all pending requests at once):

| Key | Action                     |
|-----|----------------------------|
| `A` | Allow all pending requests |
| `D` | Deny all pending requests  |

#### Sessions Tab

| Key     | Action                          |
|---------|---------------------------------|
| `Enter` | Resume the selected session     |
| `s`     | Toggle stale session visibility |
| `c`     | Clean stale session files       |

### Sound Notifications

By default, claudectl sends a terminal bell (`BEL`) when new requests arrive. Most terminals mute this by default.

For audible notifications, set `CLAUDE_CTL_SOUND_CMD`:

```bash
# Linux (PipeWire)
export CLAUDE_CTL_SOUND_CMD="pw-play /usr/share/sounds/freedesktop/stereo/bell.oga"

# Linux (PulseAudio)
export CLAUDE_CTL_SOUND_CMD="paplay /usr/share/sounds/freedesktop/stereo/bell.oga"

# Linux (ALSA)
export CLAUDE_CTL_SOUND_CMD="aplay /usr/share/sounds/freedesktop/stereo/bell.oga"

# macOS
export CLAUDE_CTL_SOUND_CMD="afplay /System/Library/Sounds/Ping.aiff"
```

Add this to your shell profile (`.bashrc`, `.zshrc`, etc.) to persist it.

Press `m` in the TUI to toggle mute.

## CLI Subcommands

All TUI functionality is also available as standalone commands for scripting:

```bash
# List active sessions
claudectl ls
claudectl ls --all      # include stale sessions
claudectl ls --json     # JSON output

# Resume a session by project name, PID, or session ID prefix
claudectl resume my-app
claudectl resume 12345
claudectl resume abc1

# Clean up stale session files
claudectl clean

# Re-run setup
claudectl setup
```

## How It Works

1. `claudectl setup` adds a `PermissionRequest` hook to `~/.claude/settings.json`
2. When Claude Code needs permission for a tool call, it fires the hook which invokes `claudectl hook-handler`
3. The hook handler writes a request file to `~/.claudectl/queue/` and waits for a response
4. The TUI polls the queue, displays pending requests, and plays a sound notification
5. You review the full request details and press `a` (allow), `d` (deny), or `r` (remember)
6. The TUI writes a response file, the hook handler picks it up and returns the decision to Claude Code
7. If you pressed `r`, the permission rule is saved to Claude Code's `settings.json` so identical future requests auto-approve

```
Claude Code ──hook──▶ hook-handler ──▶ queue/ ◀── TUI (you)
                              ◀── response ──┘
```

## File Locations

| Path | Purpose |
|------|---------|
| `~/.claudectl/queue/` | Pending request/response JSON files |
| `~/.claude/settings.json` | Claude Code hook config + remembered permissions |
| `~/.claude/sessions/*.json` | Claude Code session metadata |

## Development

```bash
npm run dev          # Watch mode (recompiles on change)
npm run build        # One-time build
npm test             # Run all tests (build first)
```

Run a single test:

```bash
node --test dist/test/<name>.test.js
```

## License

MIT
