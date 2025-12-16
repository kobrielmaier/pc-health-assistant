import Stripe from 'stripe';
import { PlanType, PLAN_CONFIG } from './db';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }
  return stripeClient;
}

// Price IDs for products (set in Stripe Dashboard, configure via env vars)
export const PRICE_IDS = {
  single_scan: process.env.STRIPE_PRICE_SINGLE_SCAN || '',   // $4.99
  single_fix: process.env.STRIPE_PRICE_SINGLE_FIX || '',     // $14.99
  starter: process.env.STRIPE_PRICE_STARTER || '',           // $19.99
  fix_pack: process.env.STRIPE_PRICE_FIX_PACK || '',         // $59.99
  monthly: process.env.STRIPE_PRICE_MONTHLY || '',           // $29.99/mo
} as const;

// Product metadata
export const PRODUCTS = {
  single_scan: {
    name: 'Single Scan',
    description: '1 diagnostic scan',
    price: 499, // cents
    scans: 1,
    fixes: 0,
    isSubscription: false,
  },
  single_fix: {
    name: 'Single Fix',
    description: '1 fix with 24-hour retry window',
    price: 1499,
    scans: 0,
    fixes: 1,
    isSubscription: false,
  },
  starter: {
    name: 'Starter Pack',
    description: '5 scans + 3 fixes',
    price: 1999,
    scans: 5,
    fixes: 3,
    isSubscription: false,
  },
  fix_pack: {
    name: 'Fix Pack',
    description: '20 scans + 12 fixes - Best Value!',
    price: 5999,
    scans: 20,
    fixes: 12,
    isSubscription: false,
  },
  monthly: {
    name: 'Monthly Pro',
    description: '40 scans + 25 fixes per month',
    price: 2999,
    scans: 40,
    fixes: 25,
    isSubscription: true,
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;

// Map price IDs to plan types
export function getPlanTypeFromPriceId(priceId: string): PlanType | null {
  for (const [planType, priceIdValue] of Object.entries(PRICE_IDS)) {
    if (priceIdValue === priceId) {
      return planType as PlanType;
    }
  }
  return null;
}

// Check if a plan is a subscription
export function isSubscriptionPlan(planType: PlanType): boolean {
  return planType === 'monthly';
}

/**
 * Create a Stripe Checkout session
 */
export async function createCheckoutSession(
  email: string,
  planType: PlanType,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripeClient();

  if (planType === 'free') {
    throw new Error('Cannot create checkout session for free plan');
  }

  const priceId = PRICE_IDS[planType as keyof typeof PRICE_IDS];

  if (!priceId) {
    throw new Error(`No price ID configured for plan: ${planType}. Please set STRIPE_PRICE_${planType.toUpperCase()} environment variable.`);
  }

  const isSubscription = isSubscriptionPlan(planType);
  const mode = isSubscription ? 'subscription' : 'payment';

  const session = await stripe.checkout.sessions.create({
    mode,
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      planType,
    },
    // Allow promotion codes for discounts
    allow_promotion_codes: true,
  });

  return session.url || '';
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Create a customer portal session for managing subscriptions
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}
