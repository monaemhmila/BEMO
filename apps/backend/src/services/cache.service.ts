import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../lib/logger";

type CacheEntry = { value: string; expiresAt: number };

export class CacheService {
  private static instance: CacheService;
  private redis?: Redis;
  private fallback = new Map<string, CacheEntry>();

  private constructor() {
    if (env.REDIS_URL) {
      this.redis = new Redis(env.REDIS_URL);
      this.redis.on("error", (error) =>
        logger.error({ error }, "Redis connection error")
      );
    }
  }

  static getInstance() {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async set(key: string, value: unknown, ttlSeconds = 300) {
    const payload = JSON.stringify(value);

    if (this.redis) {
      await this.redis.set(key, payload, "EX", ttlSeconds);
      return;
    }

    this.fallback.set(key, {
      value: payload,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async get<T>(key: string) {
    if (this.redis) {
      const value = await this.redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }

    const cached = this.fallback.get(key);
    if (!cached || cached.expiresAt < Date.now()) {
      this.fallback.delete(key);
      return null;
    }

    return JSON.parse(cached.value) as T;
  }

  async invalidate(pattern: string) {
    if (this.redis) {
      const keys = await this.redis.keys(pattern);
      if (keys.length) {
        await this.redis.del(...keys);
      }
      return;
    }

    [...this.fallback.keys()]
      .filter((key) => key.startsWith(pattern.replace("*", "")))
      .forEach((key) => this.fallback.delete(key));
  }
}

