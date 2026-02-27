export interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AICompletionResult {
  content: string;
  inputTokens: number | null;
  outputTokens: number | null;
  provider: string;
  responseTimeMs: number;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export interface AIProvider {
  readonly name: string;
  generateCompletion(
    prompt: string,
    options: AIRequestOptions,
  ): Promise<AICompletionResult>;
}

export class AIProviderError extends Error {
  code: string;
  provider: string;
  constructor(message: string, code: string, provider: string) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
    this.provider = provider;
  }
}

export class AIServiceError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
  }
}
