import { Box, render, Text } from "ink";
import { projectName } from "@tilcai-wallet/config";

function App() {
  return (
    <Box flexDirection="column">
      <Text color="magenta" bold>{projectName}</Text>
      <Text>Base TUI para tarjetas y recibos.</Text>
    </Box>
  );
}

const app = render(<App />);
await app.waitUntilRenderFlush();
app.unmount();
await app.waitUntilExit();
