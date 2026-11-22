export type ChannelId = "whatsapp" | "telegram" | "claude" | "codex" | "opencode" | "web" | "mobile" | "extension" | "cli";

type BaseScene = {
  id: ChannelId;
  name: string;
  status: string;
  detail: string;
};

type ChatMessage = {
  from: "you" | "wallet";
  text: string;
  time: string;
  title?: string;
  attachment?: "card";
  actions?: readonly (readonly string[])[];
};

export type ChatDemo = BaseScene & {
  kind: "chat";
  theme: "whatsapp" | "telegram";
  messages: readonly ChatMessage[];
};

export type TerminalDemo = BaseScene & {
  kind: "terminal";
  theme: "claude" | "codex" | "opencode" | "cli";
  setup: readonly string[];
  prompt: string;
  tool: string;
  view: "mcp" | "health";
};

export type SurfaceDemo = BaseScene & {
  kind: "surface";
  surface: "web" | "mobile" | "extension";
  action: string;
  result: string;
};

export type ChannelDemo = ChatDemo | TerminalDemo | SurfaceDemo;
