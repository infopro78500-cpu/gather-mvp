export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  onAttemptFailed?: (attempt: number, error: unknown) => void;
};

const defaultWait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  run: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 1000, onAttemptFailed }: RetryOptions = {},
  wait: (ms: number) => Promise<unknown> = defaultWait
): Promise<{ success: true; result: T } | { success: false }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await run();
      return { success: true, result };
    } catch (error) {
      onAttemptFailed?.(attempt, error);
      if (attempt < maxAttempts) {
        await wait(baseDelayMs * attempt);
      }
    }
  }
  return { success: false };
}
