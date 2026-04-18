import type { ValidationLlmClient } from './validationLlmClient'
import { BedrockValidationClient } from './bedrockValidationClient'
import { OllamaValidationClient } from './ollamaValidationClient'

export type ValidationLlmConfig =
  | {
      provider: 'ollama'
      baseUrl?: string
      model?: string
    }
  | {
      provider: 'bedrock'
      region: string
      modelId: string
    }

export function newValidationLlmClient(
  config?: ValidationLlmConfig
): ValidationLlmClient {
  if (!config || config.provider === 'ollama') {
    return new OllamaValidationClient({
      baseUrl: config?.baseUrl,
      model: config?.model
    })
  }

  return new BedrockValidationClient({
    region: config.region,
    modelId: config.modelId
  })
}
