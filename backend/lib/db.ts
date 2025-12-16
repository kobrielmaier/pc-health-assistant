import { sql } from '@vercel/postgres';
import crypto from 'crypto';

// Types
export type PlanType = 'free' | 'single_scan' | 'single_fix' | 'starter' | 'fix_pack' | 'monthly';

export interface User {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  plan_type: PlanType;
  scans_remaining: number;
  fixes_remaining: number;
  is_subscription: boolean;
  subscription_resets_at: Date | null;
  created_at: Date;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  is_active: boolean;
  created_at: Date;
  last_used_at: Date | null;
}

export interface UsageLog {
  id: string;
  user_id: string;
  action_type: 'scan' | 'fix';
  created_at: Date;
}

export interface FixSession {
  id: string;
  user_id: string;
  issue_id: string;
  started_at: Date;
  expires_at: Date;
}

// Plan configurations
export const PLAN_CONFIG = {
  free: { scans: 3, fixes: 0, price: 0 },
  single_scan: { scans: 1, fixes: 0, price: 499 }, // $4.99
  single_fix: { scans: 0, fixes: 1, price: 1499 }, // $14.99
  starter: { scans: 5, fixes: 3, price: 1999 }, // $19.99
  fix_pack: { scans: 20, fixes: 12, price: 5999 }, // $59.99
  monthly: { scans: 40, fixes: 25, price: 2999 }, // $29.99/mo
} as const;

// Initialize database tables
export async function initDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      stripe_customer_id VARCHAR(255),
      plan_type VARCHAR(50) DEFAULT 'free',
      scans_remaining INTEGER DEFAULT 3,
      fixes_remaining INTEGER DEFAULT 0,
      is_subscription BOOLEAN DEFAULT false,
      subscription_resets_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      key_hash VARCHAR(64) NOT NULL,
      key_prefix VARCHAR(12) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      last_used_at TIMESTAMP
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      action_type VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs(user_id, created_at)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS fix_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      issue_id VARCHAR(255) NOT NULL,
      started_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_fix_sessions_user_issue ON fix_sessions(user_id, issue_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      stripe_subscription_id VARCHAR(255) UNIQUE,
      stripe_price_id VARCHAR(255),
      status VARCHAR(50),
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// User operations
export async function createUser(
  email: string,
  stripeCustomerId?: string
): Promise<User> {
  const config = PLAN_CONFIG.free;
  const result = await sql`
    INSERT INTO users (email, stripe_customer_id, plan_type, scans_remaining, fixes_remaining)
    VALUES (${email}, ${stripeCustomerId || null}, 'free', ${config.scans}, ${config.fixes})
    ON CONFLICT (email) DO UPDATE SET
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, users.stripe_customer_id)
    RETURNING *
  `;
  return result.rows[0] as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql`SELECT * FROM users WHERE email = ${email}`;
  return result.rows[0] as User || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await sql`SELECT * FROM users WHERE id = ${id}`;
  return result.rows[0] as User || null;
}

export async function addUsesToUser(
  userId: string,
  planType: PlanType,
  isSubscription: boolean = false
): Promise<void> {
  const config = PLAN_CONFIG[planType];

  if (isSubscription) {
    // For subscriptions, set the uses and reset date
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    await sql`
      UPDATE users SET
        plan_type = ${planType},
        scans_remaining = ${config.scans},
        fixes_remaining = ${config.fixes},
        is_subscription = true,
        subscription_resets_at = ${resetDate.toISOString()}
      WHERE id = ${userId}
    `;
  } else {
    // For one-time purchases, add to existing uses
    await sql`
      UPDATE users SET
        plan_type = ${planType},
        scans_remaining = scans_remaining + ${config.scans},
        fixes_remaining = fixes_remaining + ${config.fixes}
      WHERE id = ${userId}
    `;
  }
}

export async function resetSubscriptionUses(userId: string): Promise<void> {
  const config = PLAN_CONFIG.monthly;
  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1);

  await sql`
    UPDATE users SET
      scans_remaining = ${config.scans},
      fixes_remaining = ${config.fixes},
      subscription_resets_at = ${resetDate.toISOString()}
    WHERE id = ${userId}
  `;
}

export async function cancelSubscription(userId: string): Promise<void> {
  await sql`
    UPDATE users SET
      is_subscription = false,
      subscription_resets_at = NULL
    WHERE id = ${userId}
  `;
}

// API Key operations
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const prefix = process.env.NODE_ENV === 'production' ? 'pch_live_' : 'pch_test_';
  const randomPart = crypto.randomBytes(24).toString('hex').slice(0, 32);
  const key = prefix + randomPart;
  const hash = crypto.createHash('sha256').update(key).digest('hex');

  return {
    key,           // Return to user ONCE (never store this)
    hash,          // Store in database
    prefix: key.slice(0, 12) + '...', // For display
  };
}

export async function createApiKey(userId: string): Promise<{ key: string; prefix: string }> {
  const { key, hash, prefix } = generateApiKey();

  await sql`
    INSERT INTO api_keys (user_id, key_hash, key_prefix)
    VALUES (${userId}, ${hash}, ${prefix})
  `;

  return { key, prefix };
}

export async function validateApiKey(key: string): Promise<{ valid: boolean; user?: User; error?: string }> {
  const hash = crypto.createHash('sha256').update(key).digest('hex');

  const result = await sql`
    SELECT ak.*, u.*
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    WHERE ak.key_hash = ${hash} AND ak.is_active = true
  `;

  if (!result.rows[0]) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Update last used timestamp
  await sql`UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = ${hash}`;

  const row = result.rows[0];
  return {
    valid: true,
    user: {
      id: row.id,
      email: row.email,
      stripe_customer_id: row.stripe_customer_id,
      plan_type: row.plan_type,
      scans_remaining: row.scans_remaining,
      fixes_remaining: row.fixes_remaining,
      is_subscription: row.is_subscription,
      subscription_resets_at: row.subscription_resets_at,
      created_at: row.created_at,
    },
  };
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await sql`UPDATE api_keys SET is_active = false WHERE id = ${keyId}`;
}

export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  const result = await sql`
    SELECT * FROM api_keys WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return result.rows as ApiKey[];
}

// Usage operations
export async function consumeScan(userId: string): Promise<{ success: boolean; remaining: number; error?: string }> {
  // Check if user has scans remaining
  const user = await getUserById(userId);
  if (!user) {
    return { success: false, remaining: 0, error: 'User not found' };
  }

  if (user.scans_remaining <= 0) {
    return { success: false, remaining: 0, error: 'No scans remaining' };
  }

  // Decrement scans
  await sql`
    UPDATE users SET scans_remaining = scans_remaining - 1 WHERE id = ${userId}
  `;

  // Log the usage
  await sql`
    INSERT INTO usage_logs (user_id, action_type) VALUES (${userId}, 'scan')
  `;

  return { success: true, remaining: user.scans_remaining - 1 };
}

export async function consumeFix(
  userId: string,
  issueId: string
): Promise<{ success: boolean; remaining: number; isNewSession: boolean; error?: string }> {
  // Check for active fix session (24-hour window)
  const existingSession = await sql`
    SELECT * FROM fix_sessions
    WHERE user_id = ${userId} AND issue_id = ${issueId} AND expires_at > NOW()
  `;

  if (existingSession.rows[0]) {
    // Active session exists - extend it and allow retry without consuming
    await sql`
      UPDATE fix_sessions SET expires_at = NOW() + INTERVAL '24 hours'
      WHERE id = ${existingSession.rows[0].id}
    `;

    const user = await getUserById(userId);
    return { success: true, remaining: user?.fixes_remaining || 0, isNewSession: false };
  }

  // No active session - need to consume a fix
  const user = await getUserById(userId);
  if (!user) {
    return { success: false, remaining: 0, isNewSession: false, error: 'User not found' };
  }

  if (user.fixes_remaining <= 0) {
    return { success: false, remaining: 0, isNewSession: false, error: 'No fixes remaining' };
  }

  // Decrement fixes
  await sql`
    UPDATE users SET fixes_remaining = fixes_remaining - 1 WHERE id = ${userId}
  `;

  // Create fix session (24-hour window for retries)
  await sql`
    INSERT INTO fix_sessions (user_id, issue_id, expires_at)
    VALUES (${userId}, ${issueId}, NOW() + INTERVAL '24 hours')
  `;

  // Log the usage
  await sql`
    INSERT INTO usage_logs (user_id, action_type) VALUES (${userId}, 'fix')
  `;

  return { success: true, remaining: user.fixes_remaining - 1, isNewSession: true };
}

export async function getActiveFixSession(userId: string, issueId: string): Promise<FixSession | null> {
  const result = await sql`
    SELECT * FROM fix_sessions
    WHERE user_id = ${userId} AND issue_id = ${issueId} AND expires_at > NOW()
  `;
  return result.rows[0] as FixSession || null;
}

export async function getUserUsageStats(userId: string): Promise<{
  scansRemaining: number;
  fixesRemaining: number;
  isSubscription: boolean;
  subscriptionResetsAt: Date | null;
  totalScansUsed: number;
  totalFixesUsed: number;
}> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const usageResult = await sql`
    SELECT
      COUNT(*) FILTER (WHERE action_type = 'scan') as total_scans,
      COUNT(*) FILTER (WHERE action_type = 'fix') as total_fixes
    FROM usage_logs
    WHERE user_id = ${userId}
  `;

  const usage = usageResult.rows[0];
  return {
    scansRemaining: user.scans_remaining,
    fixesRemaining: user.fixes_remaining,
    isSubscription: user.is_subscription,
    subscriptionResetsAt: user.subscription_resets_at,
    totalScansUsed: parseInt(usage.total_scans) || 0,
    totalFixesUsed: parseInt(usage.total_fixes) || 0,
  };
}

// Subscription operations
export async function createSubscription(
  userId: string,
  stripeSubscriptionId: string,
  stripePriceId: string,
  status: string
): Promise<void> {
  await sql`
    INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_price_id, status)
    VALUES (${userId}, ${stripeSubscriptionId}, ${stripePriceId}, ${status})
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      status = EXCLUDED.status
  `;
}

export async function updateSubscriptionStatus(stripeSubscriptionId: string, status: string): Promise<void> {
  await sql`
    UPDATE subscriptions SET status = ${status} WHERE stripe_subscription_id = ${stripeSubscriptionId}
  `;
}
