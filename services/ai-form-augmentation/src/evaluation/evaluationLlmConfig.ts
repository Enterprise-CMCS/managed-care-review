import type { ValidationLlmConfig } from '../llm'

export function getEvaluationLlmConfig(): ValidationLlmConfig | undefined {
  const provider = process.env.AI_VALIDATION_LLM_PROVIDER?.trim().toLowerCase()

  // Keep Ollama as the default so the existing local-first evaluation flow
  // remains unchanged unless a caller explicitly opts into Bedrock.
  if (!provider || provider === 'ollama') {
    return undefined
  }

  if (provider !== 'bedrock') {
    throw new Error(
      `Unsupported AI_VALIDATION_LLM_PROVIDER "${provider}". Expected "ollama" or "bedrock".`
    )
  }

  const modelId = process.env.AI_VALIDATION_BEDROCK_MODEL_ID?.trim()

  if (!modelId) {
    throw new Error(
      'AI_VALIDATION_BEDROCK_MODEL_ID is required when AI_VALIDATION_LLM_PROVIDER=bedrock.'
    )
  }

  return {
    provider: 'bedrock',
    region:
      process.env.AI_VALIDATION_BEDROCK_REGION?.trim() ||
      process.env.AWS_REGION?.trim() ||
      process.env.AWS_DEFAULT_REGION?.trim() ||
      'us-east-1',
    modelId
  }
}

export function describeEvaluationLlmConfig(
  config: ValidationLlmConfig | undefined
): string {
  if (!config || config.provider === 'ollama') {
    return 'ollama'
  }

  return `bedrock:${config.modelId}@${config.region}`
}
