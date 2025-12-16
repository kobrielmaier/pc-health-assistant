import Anthropic from '@anthropic-ai/sdk';
import { type PlanType } from './db';

// Singleton Anthropic client
let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

// Default model configuration
export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
export const DEFAULT_TEMPERATURE = 0;

// Max tokens per request by plan
export const TOKEN_LIMITS: Record<PlanType, number> = {
  free: 2048,
  single_scan: 4096,
  single_fix: 4096,
  starter: 8192,
  fix_pack: 8192,
  monthly: 16384,
} as const;
