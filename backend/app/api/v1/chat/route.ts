import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, DEFAULT_MODEL, DEFAULT_TEMPERATURE, TOKEN_LIMITS } from '@/lib/anthropic';
import { validateApiKey, checkRateLimit, getRateLimitHeaders } from '@/lib/auth';
import { type PlanType } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
  }>;
  system?: string;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
  max_tokens?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Validate API key
    const apiKey = request.headers.get('X-API-Key');
    const auth = await validateApiKey(apiKey);

    if (!auth.valid || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Invalid API key' },
        { status: 401 }
      );
    }

    const planType = (auth.planType || 'free') as PlanType;

    // 2. Check rate limit
    const rateLimit = await checkRateLimit(auth.user.id, planType);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetAt: rateLimit.resetAt },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // 3. Parse and validate request body
    const body: ChatRequest = await request.json();
    const { messages, system, tools, max_tokens } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 }
      );
    }

    // Enforce max_tokens limit based on plan
    const maxAllowed = TOKEN_LIMITS[planType] || TOKEN_LIMITS.free;
    const effectiveMaxTokens = Math.min(max_tokens || 8192, maxAllowed);

    // 4. Call Anthropic API
    const anthropic = getAnthropicClient();

    const requestParams: Parameters<typeof anthropic.messages.create>[0] = {
      model: DEFAULT_MODEL,
      max_tokens: effectiveMaxTokens,
      temperature: DEFAULT_TEMPERATURE,
      messages,
    };

    if (system) {
      requestParams.system = system;
    }

    if (tools && tools.length > 0) {
      requestParams.tools = tools;
    }

    const response = await anthropic.messages.create(requestParams);

    // 5. Return response with headers
    const duration = Date.now() - startTime;
    // Note: Usage (scans/fixes) is consumed via /api/v1/usage endpoint, not here
    return NextResponse.json(response, {
      headers: {
        ...getRateLimitHeaders(rateLimit),
        'X-Usage-Input-Tokens': String(response.usage.input_tokens),
        'X-Usage-Output-Tokens': String(response.usage.output_tokens),
        'X-Response-Time': String(duration),
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle Anthropic-specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          { error: 'AI service rate limited, please try again later' },
          { status: 429 }
        );
      }

      if (error.message.includes('invalid_api_key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'AI service error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/v1/chat' });
}
