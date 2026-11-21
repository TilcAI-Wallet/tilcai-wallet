import { defineConfig, globalIgnores } from "eslint/config";
import webVitals from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";

export default defineConfig([
  ...webVitals,
  ...ts,
  globalIgnores([".next/**", "next-env.d.ts"]),
]);
