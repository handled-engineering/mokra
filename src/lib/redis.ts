import Redis from "ioredis"

// Create a singleton Redis client
let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL

    if (redisUrl) {
      // Parse the URL - supports redis://[:password@]host:port format
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        lazyConnect: true,
      })
    } else {
      // Fallback to individual env vars
      redis = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        lazyConnect: true,
      })
    }

    redis.on("error", (err) => {
      console.error("Redis connection error:", err)
    })

    redis.on("connect", () => {
      console.log("Redis connected")
    })
  }

  return redis
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
