const maskSensitive = (data: unknown): unknown => {
  if (typeof data === "string") {
    return data
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "***@***.***")
      .replace(/user_[a-zA-Z0-9]+/g, "user_***");
  }
  if (typeof data === "object" && data !== null) {
    const masked = { ...(data as object) } as Record<string, unknown>;
    for (const key of ["email", "userId", "clerk_id", "token", "password"]) {
      if (key in masked) masked[key] = "***";
    }
    return masked;
  }
  return data;
};

export const logger = {
  info: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[INFO] ${message}`, data ? maskSensitive(data) : "");
    }
  },
  warn: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[WARN] ${message}`, data ? maskSensitive(data) : "");
    }
  },
  error: (message: string, error?: unknown) => {
    console.error(
      `[ERROR] ${message}`,
      error instanceof Error ? error.message : error
    );
  },
};
