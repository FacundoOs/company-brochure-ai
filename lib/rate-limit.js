import { RATE_LIMIT_PER_DAY } from "./constants";

/** @type {Map<string, { count: number, resetAt: number, lastRequest?: number }>} */
const store = new Map();

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Anti-spam cooling period (5 min between requests per IP).
 * Prevents burst/spam attacks without Redis.
 */
const ANTI_SPAM_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Enhanced in-memory rate limit per IP.
 * - Daily hard reset at midnight UTC (RATE_PER_DAY limit)
 * - Anti-spam cooldown to prevent script abuse
 *
 * @param {string} ip
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function checkRateLimit(ip) {
  const key = `${ip}:${dayKey()}`;
  const now = Date.now();

  let entry = store.get(key);

  // Reset daily counter if day changed
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: new Date(new Date().setDate(new Date().getUTCDate() + 1)).getTime() };
    store.set(key, entry);
  }

  // Anti-spam cooldown (5 min after last request) to prevent script abuse
  if (entry.lastRequest && now - entry.lastRequest < ANTI_SPAM_WINDOW_MS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  if (entry.count >= RATE_LIMIT_PER_DAY) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count += 1;
  entry.lastRequest = now; // track last request timestamp for anti-spam
  
  return {
    allowed: true,
    remaining: RATE_LIMIT_PER_DAY - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * @param {Request} request
 */
export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",").pop().trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}
