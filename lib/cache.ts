import { createHash } from "crypto";
import { redis } from "@/lib/redis";

/**
 * プレフィックス＋任意の値からRedisキーを生成する。
 * 値はJSON化してSHA-1でハッシュ化（日本語・長文でもキー長を一定に保つ）。
 */
export const cacheKey = (prefix: string, parts: unknown): string =>
  `${prefix}:${createHash("sha1").update(JSON.stringify(parts)).digest("hex").slice(0, 24)}`;

/**
 * Redisキャッシュ付きでfetcherを実行する。
 * - ヒットすればキャッシュ値を返す（fetcherは呼ばない）
 * - ミス時はfetcherを実行し、shouldCacheがtrueのときだけ保存する
 *   （エラー結果や0件をキャッシュして固定化しないため）
 * - Redisの失敗時はキャッシュを諦めてfetcher結果をそのまま返す
 */
export const withCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 3600,
  shouldCache: (value: T) => boolean = () => true
): Promise<T> => {
  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;
  } catch {
    // キャッシュ読み取り失敗は無視してfetcherへ
  }

  const data = await fetcher();

  try {
    if (shouldCache(data)) await redis.set(key, data, { ex: ttl });
  } catch {
    // キャッシュ書き込み失敗は無視
  }

  return data;
};
