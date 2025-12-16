import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE, TOKEN_LIMITS } from '@/lib/anthropic';
import { validateApiKey, checkRateLimit, getRateLimitHeaders } from '@/lib/auth';
import { type PlanType } from '@/lib/db';

export const runtime = 'edge';
export const maxDuration = 60;

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
      return new Response(
        JSON.stringify({ error: auth.error || 'Invalid API key' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const planType = (auth.planType || 'free') as PlanType;
    const userId = auth.user.id;

    // 2. Check rate limit
    const rateLimit = await checkRateLimit(userId, planType);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', resetAt: rateLimit.resetAt }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(rateLimit),
          },
        }
      );
    }

    // 3. Parse request body
    const body: ChatRequest = await request.json();
    const { messages, system, tools, max_tokens } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enforce max_tokens limit based on plan
    const maxAllowed = TOKEN_LIMITS[planType] || TOKEN_LIMITS.free;
    const effectiveMaxTokens = Math.min(max_tokens || 8192, maxAllowed);

    // 4. Create Anthropic client (edge-compatible)
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // 5. Create streaming response
    const requestParams: Parameters<typeof anthropic.messages.stream>[0] = {
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

    const stream = anthropic.messages.stream(requestParams);

    // Track usage for logging after stream completes
    let inputTokens = 0;
    let outputTokens = 0;

    // Convert to SSE format
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            // Track token usage from events
            if (event.type === 'message_start' && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens || 0;
            }
            if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens || 0;
            }

            // Send event as SSE
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Log stream completion (usage tracked via /api/v1/usage endpoint)
          const duration = Date.now() - startTime;
          console.log(`Stream completed: ${inputTokens} input, ${outputTokens} output, ${duration}ms`);

          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorData = `data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Stream error' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...getRateLimitHeaders(rateLimit),
      },
    });
  } catch (error) {
    console.error('Stream API error:', error);

    return new Response(
      JSON.stringify({
        error: 'AI service error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Health check
export async function GET() {
  return new Response(
    JSON.stringify({ status: 'ok', endpoint: '/api/v1/chat/stream' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
