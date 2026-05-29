import { redis } from "@/lib/redis";

export const withCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 3600
): Promise<T> => {
  try {
    const cached = await redis.get(key);
    if (cached) return cached as T;
  } catch {}

  const data = await fetcher();

  try {
    await redis.set(key, data, { ex: ttl });
  } catch {}

  return data;
};
