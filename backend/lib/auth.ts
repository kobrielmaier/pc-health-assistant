import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { validateApiKey as dbValidateApiKey, type User, type PlanType } from './db';

/**
 * SECURITY: Hash the API key for cache keys
 * Never store or cache the raw API key - only use hashes
 */
function hashForCache(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 32);
}

// Rate limits by plan (requests per minute)
export const RATE_LIMITS: Record<PlanType, number> = {
  free: 5,
  single_scan: 10,
  single_fix: 10,
  starter: 20,
  fix_pack: 30,
  monthly: 60,
} as const;

export interface AuthResult {
  valid: boolean;
  user?: User;
  planType?: PlanType;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt?: number;
}

/**
 * Validate API key and return user info
 * Uses KV cache for performance, falls back to database
 */
export async function validateApiKey(apiKey: string | null): Promise<AuthResult> {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }

  // Check format
  if (!apiKey.startsWith('pch_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  try {
    // SECURITY: Use hash for cache key, never store raw API key portions
    const cacheKey = `auth:${hashForCache(apiKey)}`;
    const cached = await kv.get<{
      userId: string;
      planType: PlanType;
      email: string;
      scansRemaining: number;
      fixesRemaining: number;
    }>(cacheKey);

    if (cached) {
      return {
        valid: true,
        user: {
          id: cached.userId,
          email: cached.email,
          plan_type: cached.planType,
          scans_remaining: cached.scansRemaining,
          fixes_remaining: cached.fixesRemaining,
          stripe_customer_id: null,
          is_subscription: false,
          subscription_resets_at: null,
          created_at: new Date(),
        },
        planType: cached.planType,
      };
    }

    // Fall back to database
    const result = await dbValidateApiKey(apiKey);

    if (!result.valid || !result.user) {
      return { valid: false, error: result.error || 'Invalid API key' };
    }

    // Cache for 1 minute (shorter since usage counts can change)
    await kv.set(
      cacheKey,
      {
        userId: result.user.id,
        planType: result.user.plan_type,
        email: result.user.email,
        scansRemaining: result.user.scans_remaining,
        fixesRemaining: result.user.fixes_remaining,
      },
      { ex: 60 }
    );

    return {
      valid: true,
      user: result.user,
      planType: result.user.plan_type,
    };
  } catch (error) {
    // If KV is not available, just use database
    console.error('KV cache error, falling back to database:', error);
    const result = await dbValidateApiKey(apiKey);

    if (!result.valid || !result.user) {
      return { valid: false, error: result.error || 'Invalid API key' };
    }

    return {
      valid: true,
      user: result.user,
      planType: result.user.plan_type,
    };
  }
}

/**
 * Check rate limit using sliding window algorithm
 */
export async function checkRateLimit(userId: string, planType: PlanType): Promise<RateLimitResult> {
  const limit = RATE_LIMITS[planType] || RATE_LIMITS.free;
  const windowMs = 60000; // 1 minute
  const now = Date.now();
  const windowKey = `ratelimit:${userId}:${Math.floor(now / windowMs)}`;

  try {
    const count = await kv.incr(windowKey);

    // Set expiry on first request in window
    if (count === 1) {
      await kv.expire(windowKey, 60);
    }

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt: Math.ceil(now / windowMs) * windowMs,
      };
    }

    return {
      allowed: true,
      remaining: limit - count,
      limit,
    };
  } catch (error) {
    // If KV is not available, allow the request (fail open)
    console.error('Rate limit check failed, allowing request:', error);
    return {
      allowed: true,
      remaining: limit,
      limit,
    };
  }
}

/**
 * Track failed authentication attempts
 */
export async function trackFailedAuth(ip: string): Promise<boolean> {
  const key = `failed_auth:${ip}`;

  try {
    const count = await kv.incr(key);

    if (count === 1) {
      await kv.expire(key, 3600); // 1 hour window
    }

    // Block after 10 failed attempts
    return count <= 10;
  } catch {
    return true; // Allow on error
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
  };

  if (result.resetAt) {
    headers['X-RateLimit-Reset'] = String(result.resetAt);
  }

  return headers;
}
