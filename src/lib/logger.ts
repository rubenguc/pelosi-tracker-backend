import pino from "pino";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export function createLogger(env: { ENV?: string; LOG_LEVEL?: string }) {
  const isLocal = env.ENV === "local";
  const level: LogLevel =
    (env.LOG_LEVEL as LogLevel) ?? (isLocal ? "debug" : "error");

  return pino({
    level,
    base: {
      env: env.ENV ?? "unknown",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
