import React from "react";
import { Box, Text } from "ink";

export interface QueueRequest {
  id: string;
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  cwd: string;
  project: string;
  timestamp: number;
}

function toolSummary(req: QueueRequest): string {
  if (req.tool_name === "Bash" && req.tool_input.command) {
    return String(req.tool_input.command);
  }
  if (
    (req.tool_name === "Edit" || req.tool_name === "Write") &&
    req.tool_input.file_path
  ) {
    return String(req.tool_input.file_path);
  }
  const keys = Object.keys(req.tool_input);
  if (keys.length > 0) {
    return String(req.tool_input[keys[0]]);
  }
  return "(no details)";
}

interface PermissionListProps {
  requests: QueueRequest[];
  selected: number;
}

export function PermissionList({ requests, selected }: PermissionListProps) {
  if (requests.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No pending requests. Watching...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {requests.map((req, i) => {
        const isSelected = i === selected;
        return (
          <Box key={req.id} paddingX={1} flexDirection="row">
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {isSelected ? "▶ " : "  "}
            </Text>
            <Text color="yellow" bold={isSelected}>
              {req.project}
            </Text>
            <Text bold> {req.tool_name} </Text>
            <Text wrap="truncate-end">{toolSummary(req)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
