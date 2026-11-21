import { createApi } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig(process.env);
const api = createApi({ logger: true });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void api.close().catch((error: unknown) => {
      api.log.error(error);
      process.exitCode = 1;
    });
  });
}

try {
  await api.listen(config);
} catch (error: unknown) {
  api.log.error(error);
  process.exitCode = 1;
}
