import { Bot } from "grammy";
import { z } from "zod";
import { projectName } from "@tilcai-wallet/config";

export function createBot(token: string) {
  return new Bot(z.string().min(1).parse(token));
}

console.log(`Telegram adapter module for ${projectName} loaded.`);
