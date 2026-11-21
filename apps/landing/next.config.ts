import type { NextConfig } from "next";

const config: NextConfig = {
  // Static HTML in out/, deployable to any static host.
  output: "export",
  transpilePackages: ["@tilcai-wallet/config"],
};

export default config;
