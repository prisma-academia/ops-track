import pino from "pino";
import { env, isProd } from "./env";

export const logger = pino({
  level: isProd ? "info" : "debug",
  base: { env: env.NODE_ENV },
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }),
});
