import type {
  GenerateValidationInput,
  GenerateValidationResult,
  ValidationLlmClient
} from './validationLlmClient'

interface OllamaValidationClientOptions {
  baseUrl?: string
  model?: string
}

interface OllamaGenerateResponse {
  response: string
  done: boolean
}

function summarizeOllamaErrorBody(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (normalized.length === 0) {
    return '[empty response body]'
  }

  if (normalized.length <= 200) {
    return normalized
  }

  return `${normalized.slice(0, 200)}... [truncated ${normalized.length - 200} chars]`
}

export class OllamaValidationClient implements ValidationLlmClient {
  private readonly baseUrl: string
  private readonly model: string

  constructor(options: OllamaValidationClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://127.0.0.1:11434'
    this.model = options.model ?? 'llama3.1:8b'
  }

  async generateValidation(input: GenerateValidationInput): Promise<GenerateValidationResult> {
    // Use Ollama's non-streaming generate endpoint first so local verification
    // can focus on prompt quality and raw output shape before adding streaming
    // or structured parsing concerns.
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt: input.prompt,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()

      throw new Error(
        `Ollama request failed (${response.status} ${response.statusText}): ${summarizeOllamaErrorBody(errorText)}`
      )
    }

    const data = (await response.json()) as OllamaGenerateResponse

    // Fail fast on empty output so downstream parsing does not have to guess
    // whether the model responded or the transport silently degraded.
    if (typeof data.response !== 'string' || data.response.trim().length === 0) {
      throw new Error('Ollama returned an empty response')
    }

    return {
      rawText: data.response.trim(),
      model: this.model
    }
  }
}
