export type ChannelId = "whatsapp" | "telegram" | "claude" | "codex" | "opencode" | "web" | "mobile" | "extension" | "cli";

type BaseScene = {
  id: ChannelId;
  name: string;
  status: string;
  detail: string;
};

export type ChatDemo = BaseScene & {
  kind: "chat";
  theme: "whatsapp" | "telegram";
  messages: readonly { from: "you" | "wallet"; text: string; time: string }[];
};

export type TerminalDemo = BaseScene & {
  kind: "terminal";
  theme: "claude" | "codex" | "opencode" | "cli";
  lines: readonly { tone: "prompt" | "tool" | "result"; text: string }[];
};

export type SurfaceDemo = BaseScene & {
  kind: "surface";
  surface: "web" | "mobile" | "extension";
  action: string;
  result: string;
};

export type ChannelDemo = ChatDemo | TerminalDemo | SurfaceDemo;
