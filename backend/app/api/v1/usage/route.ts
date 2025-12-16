import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth';
import { consumeScan, consumeFix, getUserUsageStats, getActiveFixSession } from '@/lib/db';

export const runtime = 'nodejs';

// GET - Get current usage stats
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const authResult = await validateApiKey(apiKey);

    if (!authResult.valid || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Invalid API key' },
        { status: 401 }
      );
    }

    const stats = await getUserUsageStats(authResult.user.id);

    return NextResponse.json({
      scansRemaining: stats.scansRemaining,
      fixesRemaining: stats.fixesRemaining,
      isSubscription: stats.isSubscription,
      subscriptionResetsAt: stats.subscriptionResetsAt,
      totalScansUsed: stats.totalScansUsed,
      totalFixesUsed: stats.totalFixesUsed,
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    );
  }
}

// POST - Consume a scan or fix
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const authResult = await validateApiKey(apiKey);

    if (!authResult.valid || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { actionType, issueId } = body as { actionType: 'scan' | 'fix'; issueId?: string };

    if (!actionType || !['scan', 'fix'].includes(actionType)) {
      return NextResponse.json(
        { error: 'actionType must be "scan" or "fix"' },
        { status: 400 }
      );
    }

    if (actionType === 'fix' && !issueId) {
      return NextResponse.json(
        { error: 'issueId is required for fix actions' },
        { status: 400 }
      );
    }

    let result;
    if (actionType === 'scan') {
      result = await consumeScan(authResult.user.id);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error,
            scansRemaining: 0,
            needsPurchase: true,
          },
          { status: 402 } // Payment Required
        );
      }

      return NextResponse.json({
        success: true,
        scansRemaining: result.remaining,
        message: 'Scan consumed successfully',
      });
    } else {
      // Fix action
      result = await consumeFix(authResult.user.id, issueId!);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error,
            fixesRemaining: 0,
            needsPurchase: true,
          },
          { status: 402 } // Payment Required
        );
      }

      return NextResponse.json({
        success: true,
        fixesRemaining: result.remaining,
        isNewSession: result.isNewSession,
        message: result.isNewSession
          ? 'Fix session started (24-hour window for retries)'
          : 'Using existing fix session (no additional charge)',
      });
    }
  } catch (error) {
    console.error('Consume usage error:', error);
    return NextResponse.json(
      { error: 'Failed to consume usage' },
      { status: 500 }
    );
  }
}
