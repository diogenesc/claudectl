import React from "react";
import { Box } from "ink";

interface LayoutProps {
  list: React.ReactNode;
  detail: React.ReactNode;
}

export function Layout({ list, detail }: LayoutProps) {
  return (
    <Box flexGrow={1} flexDirection="row">
      <Box flexDirection="column" width="50%" borderStyle="single" borderColor="gray">
        {list}
      </Box>
      <Box flexDirection="column" width="50%" borderStyle="single" borderColor="gray">
        {detail}
      </Box>
    </Box>
  );
}
