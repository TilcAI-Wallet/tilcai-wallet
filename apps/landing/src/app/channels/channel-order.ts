import type { ChannelDemo } from "./channel-types";
import { chatDemos } from "./chat-demos";
import { surfaceDemos } from "./surface-demos";
import { agentDemos, cliDemo } from "./terminal-demos";

export const channels = [...chatDemos, ...agentDemos, ...surfaceDemos, cliDemo] satisfies readonly ChannelDemo[];
