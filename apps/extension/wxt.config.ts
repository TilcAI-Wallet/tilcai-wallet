import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifestVersion: 3,
  manifest: {
    name: "TilcAI Wallet",
    description: "Superficie de navegador para la wallet.",
  },
});
