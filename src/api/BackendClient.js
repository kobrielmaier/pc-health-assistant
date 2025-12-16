/**
 * Backend API Client
 * Replaces direct Anthropic SDK calls with our backend proxy
 */

class BackendClient {
  constructor(apiKey, baseUrl = null) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || process.env.BACKEND_API_URL || 'https://pc-health-api.vercel.app';
  }

  /**
   * Update the API key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Check if an API key is configured
   */
  hasApiKey() {
    return !!this.apiKey;
  }

  /**
   * Validate the current API key
   */
  async validateKey() {
    if (!this.apiKey) {
      return { valid: false, error: 'No API key configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { valid: false, error: data.error || 'Invalid API key' };
      }

      return data;
    } catch (error) {
      console.error('API key validation error:', error);
      return { valid: false, error: error.message || 'Network error' };
    }
  }

  /**
   * Send a chat message (non-streaming)
   * Compatible with Anthropic SDK response format
   */
  async chat(params) {
    if (!this.apiKey) {
      throw new Error('API key is required. Please configure your API key in Settings.');
    }

    const { messages, system, tools, max_tokens = 8192 } = params;

    const response = await fetch(`${this.baseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        messages,
        system,
        tools,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));

      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your API key in Settings.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      throw new Error(error.error || `API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Send a chat message with streaming
   * Returns an async generator that yields events
   */
  async *chatStream(params) {
    if (!this.apiKey) {
      throw new Error('API key is required. Please configure your API key in Settings.');
    }

    const { messages, system, tools, max_tokens = 8192 } = params;

    const response = await fetch(`${this.baseUrl}/api/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        messages,
        system,
        tools,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));

      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your API key in Settings.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      throw new Error(error.error || `API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              return;
            }

            try {
              const event = JSON.parse(data);
              yield event;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Helper to create a messages.create-like interface
   * that matches Anthropic SDK structure
   */
  get messages() {
    const self = this;
    return {
      async create(params) {
        return self.chat(params);
      },
      stream(params) {
        return self.chatStream(params);
      },
    };
  }
}

module.exports = { BackendClient };
