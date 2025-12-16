import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, RATE_LIMITS } from '@/lib/auth';
import { getUserUsageStats, type PlanType } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key');
    const auth = await validateApiKey(apiKey);

    if (!auth.valid || !auth.user) {
      return NextResponse.json(
        { valid: false, error: auth.error || 'Invalid API key' },
        { status: 401 }
      );
    }

    const planType = (auth.planType || 'free') as PlanType;

    // Get current usage stats
    const stats = await getUserUsageStats(auth.user.id);

    return NextResponse.json({
      valid: true,
      user: {
        email: auth.user.email,
        planType,
      },
      limits: {
        rateLimit: RATE_LIMITS[planType],
      },
      usage: {
        scansRemaining: stats.scansRemaining,
        fixesRemaining: stats.fixesRemaining,
        totalScansUsed: stats.totalScansUsed,
        totalFixesUsed: stats.totalFixesUsed,
        isSubscription: stats.isSubscription,
        subscriptionResetsAt: stats.subscriptionResetsAt,
      },
    });
  } catch (error) {
    console.error('Validate API error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation error' },
      { status: 500 }
    );
  }
}

// Also support GET for convenience
export async function GET(request: NextRequest) {
  return POST(request);
}
