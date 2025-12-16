import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, PRODUCTS, type ProductId } from '@/lib/stripe';
import { type PlanType } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, planType } = body as { email: string; planType: PlanType };

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Validate plan type
    if (!planType || planType === 'free') {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    const validPlans: PlanType[] = ['single_scan', 'single_fix', 'starter', 'fix_pack', 'monthly'];
    if (!validPlans.includes(planType)) {
      return NextResponse.json(
        { error: `Invalid plan type. Valid options: ${validPlans.join(', ')}` },
        { status: 400 }
      );
    }

    // Get success/cancel URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pc-health-assistant.com';
    const successUrl = `${appUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/purchase/cancel`;

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      email,
      planType,
      successUrl,
      cancelUrl
    );

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available plans
export async function GET() {
  const plans = Object.entries(PRODUCTS).map(([id, product]) => ({
    id,
    name: product.name,
    description: product.description,
    price: product.price / 100, // Convert cents to dollars
    priceFormatted: `$${(product.price / 100).toFixed(2)}${product.isSubscription ? '/mo' : ''}`,
    scans: product.scans,
    fixes: product.fixes,
    isSubscription: product.isSubscription,
  }));

  return NextResponse.json({ plans });
}
