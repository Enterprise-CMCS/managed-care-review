export interface GenerateValidationInput {
  prompt: string
}

export interface GenerateValidationResult {
  rawText: string
  model: string
}

export interface ValidationLlmClient {
  // Keep the first LLM seam narrow: send a prompt, get raw text back. A later
  // parsing layer can normalize code fences, extra prose, and JSON shape.
  generateValidation(
    input: GenerateValidationInput
  ): Promise<GenerateValidationResult>
}
