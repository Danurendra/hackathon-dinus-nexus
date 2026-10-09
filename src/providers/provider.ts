import { LlmRequest, LlmResponse, ProviderMeta } from '../domain/types';

// Provider interface
export interface LlmProvider {
  name: string;
  call(request: LlmRequest): Promise<LlmResponse>;
  getMetadata(): ProviderMeta;
}

// Configuration interface
export interface ProviderConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

// Provider factory
export class ProviderFactory {
  static createProvider(config: ProviderConfig): LlmProvider {
    // Check if we have all required configuration
    const hasFullConfig = config.apiKey && config.baseUrl && config.model;
    
    if (hasFullConfig) {
      return new OpenAICompatibleProvider(config);
    } else {
      // Fallback to fake provider when configuration is incomplete
      console.warn('Incomplete provider configuration, falling back to fake provider');
      return new FakeProvider(config);
    }
  }
}

// Base provider class
export abstract class BaseProvider implements LlmProvider {
  protected config: ProviderConfig;
  
  constructor(config: ProviderConfig) {
    this.config = config;
  }
  
  abstract name: string;
  abstract call(request: LlmRequest): Promise<LlmResponse>;
  abstract getMetadata(): ProviderMeta;
}

// OpenAI-compatible provider implementation
export class OpenAICompatibleProvider extends BaseProvider {
  name = "openai-compatible";
  
  async call(request: LlmRequest): Promise<LlmResponse> {
    const url = `${this.config.baseUrl}/chat/completions`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };
    
    // Prepare request body
    const requestBody = {
      model: this.config.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens
    };
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process the response to match our expected format
      return {
        id: (data as any).id || `response-${Date.now()}`,
        choices: (data as any).choices || [],
        usage: (data as any).usage
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Provider error: ${error.message}`);
      } else {
        throw new Error('Provider error: Unknown error occurred');
      }
    }
  }
  
  getMetadata(): ProviderMeta {
    return {
      provider: this.name,
      model: this.config.model,
      baseUrl: this.config.baseUrl,
      degraded: false
    };
  }
}

// Fake provider for testing and fallback scenarios
export class FakeProvider extends BaseProvider {
  name = "fake";
  
  async call(request: LlmRequest): Promise<LlmResponse> {
    // Simulate different responses based on request content
    const messages = request.messages;
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Determine response based on content
    let responseContent = '';
    let finishReason = 'stop';
    
    if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
      responseContent = 'Hello! I am a fake AI assistant for demonstration purposes.';
    } else if (lastMessage.toLowerCase().includes('error')) {
      throw new Error('Simulated provider error');
    } else {
      responseContent = `This is a simulated response to: "${lastMessage.substring(0, 30)}..."`;
    }
    
    // Simulate token usage
    const promptTokens = Math.max(10, Math.floor(Math.random() * 50));
    const completionTokens = Math.max(10, Math.floor(Math.random() * 100));
    
    return {
      id: `fake-response-${Date.now()}`,
      choices: [{
        message: { role: 'assistant', content: responseContent },
        finish_reason: finishReason
      }],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    };
  }
  
  getMetadata(): ProviderMeta {
    return {
      provider: this.name,
      model: 'fake-model',
      baseUrl: 'https://fake-provider.example.com',
      degraded: true
    };
  }
}

// Utility function to resolve provider configuration from environment
export function resolveProviderConfig(): ProviderConfig {
  const env = process.env;
  
  return {
    provider: env.DINUS_LLM_PROVIDER || 'openai-compatible',
    baseUrl: env.DINUS_LLM_BASE_URL || '',
    apiKey: env.DINUS_LLM_API_KEY || '',
    model: env.DINUS_LLM_MODEL || 'qwen3-coder-flash',
    timeoutMs: parseInt(env.DINUS_LLM_TIMEOUT_MS || '5000', 10),
    maxRetries: parseInt(env.DINUS_LLM_MAX_RETRIES || '3', 10)
  };
}