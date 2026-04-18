import {
  BedrockRuntimeClient,
  ConverseCommand
} from '@aws-sdk/client-bedrock-runtime'
import type {
  GenerateValidationInput,
  GenerateValidationResult,
  ValidationLlmClient
} from './validationLlmClient'

export interface BedrockValidationClientOptions {
  region: string
  modelId: string
}

export class BedrockValidationClient implements ValidationLlmClient {
  private readonly client: BedrockRuntimeClient
  private readonly modelId: string

  constructor(options: BedrockValidationClientOptions) {
    this.client = new BedrockRuntimeClient({
      region: options.region
    })
    this.modelId = options.modelId
  }

  async generateValidation(
    input: GenerateValidationInput
  ): Promise<GenerateValidationResult> {
    // Use the generic Converse API so evaluation can swap production-like
    // Bedrock models without reshaping the worker around one model family's
    // request body format.
    const response = await this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        inferenceConfig: {
          maxTokens: 1200,
          temperature: 0
        },
        messages: [
          {
            role: 'user',
            content: [
              {
                text: input.prompt
              }
            ]
          }
        ]
      })
    )

    const rawText = response.output?.message?.content
      ?.flatMap((content) => ('text' in content && content.text ? [content.text] : []))
      .join('\n')
      .trim()

    if (!rawText) {
      throw new Error('Bedrock returned an empty response')
    }

    return {
      rawText,
      model: this.modelId
    }
  }
}
