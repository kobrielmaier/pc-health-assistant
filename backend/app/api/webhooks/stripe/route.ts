import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, getPlanTypeFromPriceId, isSubscriptionPlan, PRODUCTS } from '@/lib/stripe';
import {
  createUser,
  createApiKey,
  addUsesToUser,
  resetSubscriptionUses,
  cancelSubscription as cancelUserSubscription,
  createSubscription,
  updateSubscriptionStatus,
  getUserByEmail,
  type PlanType
} from '@/lib/db';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendApiKeyEmail(email: string, apiKey: string, planType: PlanType) {
  if (!resend) {
    console.log('Resend not configured, skipping email for user');
    return;
  }

  const product = PRODUCTS[planType as keyof typeof PRODUCTS];
  if (!product) return;

  const planName = product.name;
  const planDescription = product.isSubscription
    ? `You have access to ${product.scans} scans and ${product.fixes} fixes per month while your subscription is active.`
    : `You have received ${product.scans} scans and ${product.fixes} fixes. These never expire!`;

  try {
    await resend.emails.send({
      from: 'PC Health Assistant <noreply@pchealth-assistant.com>',
      to: email,
      subject: 'Your PC Health Assistant License Key',
      html: `
        <h1>Welcome to PC Health Assistant!</h1>
        <p>Thank you for purchasing the <strong>${planName}</strong> plan.</p>
        <p>${planDescription}</p>
        <p>Your license key is:</p>
        <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 14px;">${apiKey}</pre>
        <p><strong>Important:</strong> This key will only be shown once. Please save it securely.</p>
        <h2>How to use your license key:</h2>
        <ol>
          <li>Open PC Health Assistant</li>
          <li>Go to Settings</li>
          <li>Paste your license key</li>
          <li>Start using the AI-powered diagnostics!</li>
        </ol>
        <p>If you have any questions, please contact support.</p>
      `,
    });
    console.log('License key email sent to:', email);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

async function sendUsesAddedEmail(email: string, planType: PlanType) {
  if (!resend) return;

  const product = PRODUCTS[planType as keyof typeof PRODUCTS];
  if (!product) return;

  try {
    await resend.emails.send({
      from: 'PC Health Assistant <noreply@pchealth-assistant.com>',
      to: email,
      subject: 'PC Health Assistant - Uses Added!',
      html: `
        <h1>Your purchase was successful!</h1>
        <p>We've added <strong>${product.scans} scans</strong> and <strong>${product.fixes} fixes</strong> to your account.</p>
        <p>Open PC Health Assistant to start using them!</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send uses added email:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Verify webhook signature
    let event;
    try {
      event = verifyWebhookSignature(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Received Stripe event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const planType = (session.metadata?.planType || 'starter') as PlanType;
        const isSubscription = session.mode === 'subscription';

        if (!email) {
          console.error('No email in checkout session');
          break;
        }

        console.log(`Processing checkout for ${email}, plan: ${planType}, subscription: ${isSubscription}`);

        // Check if user already exists
        let user = await getUserByEmail(email);
        const isNewUser = !user;

        if (isNewUser) {
          // Create new user
          user = await createUser(email, customerId);
          console.log('New user created:', user.id);

          // Generate API key for new users
          const { key } = await createApiKey(user.id);
          console.log('License key generated for user:', user.id);

          // Send license key via email
          await sendApiKeyEmail(email, key, planType);
        } else {
          // Existing user - just notify about added uses
          await sendUsesAddedEmail(email, planType);
        }

        // Add uses to user account
        await addUsesToUser(user.id, planType, isSubscription);
        console.log(`Added ${planType} uses to user:`, user.id);

        // Create subscription record (only for subscriptions)
        if (subscriptionId) {
          await createSubscription(user.id, subscriptionId, planType, 'active');
        }

        break;
      }

      case 'invoice.paid': {
        // Subscription renewal - reset uses
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription as string;
        const customerEmail = invoice.customer_email;

        if (subscriptionId && customerEmail && invoice.billing_reason === 'subscription_cycle') {
          console.log('Subscription renewed, resetting uses for:', customerEmail);

          const user = await getUserByEmail(customerEmail);
          if (user) {
            await resetSubscriptionUses(user.id);
            console.log('Uses reset for user:', user.id);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await updateSubscriptionStatus(subscription.id, subscription.status);
        console.log('Subscription updated:', subscription.id, 'Status:', subscription.status);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await updateSubscriptionStatus(subscription.id, 'canceled');

        // Get user and cancel their subscription status
        const customerEmail = (subscription as any).customer_email;
        if (customerEmail) {
          const user = await getUserByEmail(customerEmail);
          if (user) {
            await cancelUserSubscription(user.id);
            console.log('Subscription canceled for user:', user.id);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Payment failed for invoice:', invoice.id);
        // Could send notification email here
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 }
    );
  }
}
