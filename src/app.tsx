import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { TabBar, type TabId } from "./components/tab-bar.js";
import { HelpBar } from "./components/help-bar.js";
import { Layout } from "./components/layout.js";
import { SessionList } from "./components/session-list.js";
import { SessionDetail } from "./components/session-detail.js";
import {
  PermissionList,
  type QueueRequest,
} from "./components/permission-list.js";
import { PermissionDetail } from "./components/permission-detail.js";
import { discoverSessions, type SessionInfo } from "./sessions.js";
import { ensureQueueDir, QUEUE_DIR } from "./paths.js";
import { rememberPermission } from "./remember.js";
import { notify, isMuted, toggleMute } from "./notifications.js";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

function getPendingRequests(): QueueRequest[] {
  ensureQueueDir();
  try {
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
  } catch {
    return [];
  }
}

function writeResponseFile(id: string, decision: "allow" | "deny"): void {
  const responsePath = join(QUEUE_DIR, `${id}.response.json`);
  const tmpPath = join(QUEUE_DIR, `${id}.response.tmp`);
  writeFileSync(tmpPath, JSON.stringify({ decision }));
  renameSync(tmpPath, responsePath);
}

interface FlashMessage {
  text: string;
  color: string;
}

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [activeTab, setActiveTab] = useState<TabId>("permissions");
  const [muted, setMuted] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [showStale, setShowStale] = useState(false);

  // Permissions state
  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [permIdx, setPermIdx] = useState(0);
  const [detailScroll, setDetailScroll] = useState(0);

  // Flash messages
  const [flash, setFlash] = useState<FlashMessage | null>(null);

  // Track previous request IDs for new-request detection
  const prevRequestIdsRef = useRef<Set<string>>(new Set());
  const isFirstPollRef = useRef(true);

  // Polling
  useEffect(() => {
    const poll = () => {
      const newSessions = discoverSessions();
      setSessions(newSessions);

      const newRequests = getPendingRequests();

      // Detect new requests for notification
      const newIds = new Set(newRequests.map((r) => r.id));
      const prevIds = prevRequestIdsRef.current;

      if (isFirstPollRef.current) {
        // Skip notification on first poll (don't alert for pre-existing requests)
        isFirstPollRef.current = false;
      } else {
        let hasNew = false;
        for (const id of newIds) {
          if (!prevIds.has(id)) {
            hasNew = true;
            break;
          }
        }
        if (hasNew) {
          notify();
        }
      }
      prevRequestIdsRef.current = newIds;

      setRequests(newRequests);
    };

    poll();
    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, []);

  // Clamp indices when lists change
  useEffect(() => {
    const visibleSessions = showStale
      ? sessions
      : sessions.filter((s) => s.status === "active");
    if (sessionIdx >= visibleSessions.length) {
      setSessionIdx(Math.max(0, visibleSessions.length - 1));
    }
  }, [sessions, showStale, sessionIdx]);

  useEffect(() => {
    if (permIdx >= requests.length) {
      setPermIdx(Math.max(0, requests.length - 1));
    }
  }, [requests, permIdx]);

  // Reset detail scroll on selection change
  useEffect(() => {
    setDetailScroll(0);
  }, [permIdx, sessionIdx, activeTab]);

  const showFlash = useCallback((text: string, color: string) => {
    setFlash({ text, color });
    setTimeout(() => setFlash(null), 1500);
  }, []);

  const visibleSessions = showStale
    ? sessions
    : sessions.filter((s) => s.status === "active");

  const selectedSession = visibleSessions[sessionIdx] ?? null;
  const selectedRequest = requests[permIdx] ?? null;

  useInput((input, key) => {
    // Global keys
    if (input === "q") {
      exit();
      return;
    }

    if (key.tab) {
      setActiveTab((t) => (t === "sessions" ? "permissions" : "sessions"));
      return;
    }

    if (input === "m") {
      const nowMuted = toggleMute();
      setMuted(nowMuted);
      return;
    }

    // Detail pane scrolling (Shift+J/K)
    if (input === "J") {
      setDetailScroll((s) => s + 3);
      return;
    }
    if (input === "K") {
      setDetailScroll((s) => Math.max(0, s - 3));
      return;
    }

    if (activeTab === "sessions") {
      const listLen = visibleSessions.length;
      if ((input === "j" || key.downArrow) && listLen > 0) {
        setSessionIdx((i) => Math.min(i + 1, listLen - 1));
      } else if ((input === "k" || key.upArrow) && listLen > 0) {
        setSessionIdx((i) => Math.max(0, i - 1));
      } else if (key.return && selectedSession) {
        if (selectedSession.status === "stale") {
          showFlash("Session is stale — cannot resume.", "red");
        } else {
          // Suspend TUI and resume session
          // We need to exit ink, run claude, then the user relaunches
          try {
            exit();
            execFileSync("claude", ["--resume", selectedSession.sessionId], {
              stdio: "inherit",
            });
          } catch {
            // Claude session ended or was interrupted
          }
        }
      } else if (input === "s") {
        setShowStale((v) => !v);
        setSessionIdx(0);
      } else if (input === "c") {
        const stale = sessions.filter((s) => s.status === "stale");
        if (stale.length === 0) {
          showFlash("No stale sessions to clean.", "yellow");
        } else {
          // Inline clean — import is circular, so do it directly
          import("./clean.js").then(({ cleanStaleSessions }) => {
            cleanStaleSessions();
            showFlash(`Cleaned ${stale.length} stale session(s).`, "green");
          });
        }
      }
    }

    if (activeTab === "permissions") {
      const listLen = requests.length;
      if ((input === "j" || key.downArrow) && listLen > 0) {
        setPermIdx((i) => Math.min(i + 1, listLen - 1));
      } else if ((input === "k" || key.upArrow) && listLen > 0) {
        setPermIdx((i) => Math.max(0, i - 1));
      } else if (input === "a" && selectedRequest) {
        writeResponseFile(selectedRequest.id, "allow");
      } else if (input === "d" && selectedRequest) {
        writeResponseFile(selectedRequest.id, "deny");
      } else if (input === "r" && selectedRequest) {
        writeResponseFile(selectedRequest.id, "allow");
        const result = rememberPermission(
          selectedRequest.tool_name,
          selectedRequest.tool_input,
          "allow",
        );
        if (result.alreadyExists) {
          showFlash("Already remembered (allow).", "yellow");
        } else {
          showFlash(`✓ Always allow: ${result.permission}`, "green");
        }
      } else if (input === "R" && selectedRequest) {
        writeResponseFile(selectedRequest.id, "deny");
        const result = rememberPermission(
          selectedRequest.tool_name,
          selectedRequest.tool_input,
          "deny",
        );
        if (result.alreadyExists) {
          showFlash("Already remembered (deny).", "yellow");
        } else {
          showFlash(`✗ Always deny: ${result.permission}`, "red");
        }
      } else if (input === "A") {
        for (const req of requests) {
          writeResponseFile(req.id, "allow");
        }
        showFlash(`Allowed ${requests.length} request(s).`, "green");
      } else if (input === "D") {
        for (const req of requests) {
          writeResponseFile(req.id, "deny");
        }
        showFlash(`Denied ${requests.length} request(s).`, "red");
      }
    }
  });

  const listPanel =
    activeTab === "sessions" ? (
      <SessionList
        sessions={sessions}
        selected={sessionIdx}
        showStale={showStale}
      />
    ) : (
      <PermissionList requests={requests} selected={permIdx} />
    );

  const detailPanel =
    activeTab === "sessions" ? (
      <SessionDetail session={selectedSession} />
    ) : (
      <PermissionDetail request={selectedRequest} scrollOffset={detailScroll} />
    );

  const termHeight = stdout?.rows ?? 24;

  return (
    <Box flexDirection="column" height={termHeight}>
      <Box flexDirection="row" justifyContent="space-between">
        <TabBar activeTab={activeTab} permissionCount={requests.length} />
        <Text bold dimColor>
          claudectl
        </Text>
      </Box>

      <Layout list={listPanel} detail={detailPanel} />

      {flash && (
        <Box>
          <Text color={flash.color as any}> {flash.text}</Text>
        </Box>
      )}

      <HelpBar activeTab={activeTab} muted={muted} />
    </Box>
  );
}
