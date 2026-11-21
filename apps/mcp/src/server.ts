import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { projectVersion } from "@tilcai-wallet/config";

serveStdio(() => new McpServer(
  { name: "tilcai-wallet", version: projectVersion },
  { capabilities: { tools: {} } },
));
