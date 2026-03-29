import React from "react";
import { Box, Text } from "ink";
import type { QueueRequest } from "./permission-list.js";

interface PermissionDetailProps {
  request: QueueRequest | null;
  scrollOffset: number;
}

function highlightJson(json: string): React.ReactNode[] {
  const lines = json.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;

    // Match JSON key
    const keyMatch = remaining.match(/^(\s*)"([^"]+)":/);
    if (keyMatch) {
      parts.push(<Text key={`ws-${i}`}>{keyMatch[1]}</Text>);
      parts.push(
        <Text key={`key-${i}`} color="cyan">
          &quot;{keyMatch[2]}&quot;
        </Text>,
      );
      parts.push(<Text key={`colon-${i}`}>:</Text>);
      remaining = remaining.slice(keyMatch[0].length);
      keyIdx = 3;
    }

    // Colorize value
    const trimmed = remaining.trim();
    if (/^".*"[,]?$/.test(trimmed)) {
      parts.push(
        <Text key={`val-${i}`} color="green">
          {remaining}
        </Text>,
      );
    } else if (/^-?\d+(\.\d+)?[,]?$/.test(trimmed)) {
      parts.push(
        <Text key={`val-${i}`} color="yellow">
          {remaining}
        </Text>,
      );
    } else if (/^(true|false|null)[,]?$/.test(trimmed)) {
      parts.push(
        <Text key={`val-${i}`} color="magenta">
          {remaining}
        </Text>,
      );
    } else {
      parts.push(<Text key={`val-${i}`}>{remaining}</Text>);
    }

    return (
      <Text key={`line-${i}`}>
        {parts}
      </Text>
    );
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text dimColor>{label.padEnd(10)}</Text>
      <Text>{value}</Text>
    </Box>
  );
}

export function PermissionDetail({ request, scrollOffset }: PermissionDetailProps) {
  if (!request) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No request selected.</Text>
      </Box>
    );
  }

  const jsonStr = JSON.stringify(request.tool_input, null, 2);
  const jsonLines = highlightJson(jsonStr);
  const visibleLines = jsonLines.slice(scrollOffset);

  return (
    <Box flexDirection="column" paddingX={1} flexGrow={1}>
      <Text bold color="cyan">
        Request Details
      </Text>
      <Text> </Text>
      <Field label="Tool:" value={request.tool_name} />
      <Field label="Session:" value={request.session_id} />
      <Field label="Project:" value={request.project} />
      <Field label="CWD:" value={request.cwd} />
      <Field
        label="Time:"
        value={new Date(request.timestamp).toLocaleString()}
      />
      <Text> </Text>
      <Text bold>Input:</Text>
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines}
      </Box>
      {scrollOffset > 0 && (
        <Text dimColor>↑ Scroll up (Shift+K)</Text>
      )}
    </Box>
  );
}
