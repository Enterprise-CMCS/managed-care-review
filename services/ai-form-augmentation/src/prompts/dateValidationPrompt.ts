export interface DateValidationFieldInput {
  field: 'contractStartDate' | 'contractEndDate' | 'amendmentEffectiveDate'
  label: string
  value: string
}

export interface DateValidationCitationInput {
  chunkId: string
  documentName: string
  page: number | null
  order: number
  text: string
}

export interface BuildDateValidationPromptInput {
  formFields: DateValidationFieldInput[]
  retrievedChunks: DateValidationCitationInput[]
}

export interface DateValidationResult {
  field: string
  outcome: 'match' | 'mismatch' | 'not-enough-evidence'
  confidence: 'high' | 'medium' | 'low'
  message: string
  citations: Array<{
    chunkId: string
    documentName: string
    page: number | null
    order: number
  }>
}

function formatFormFields(fields: DateValidationFieldInput[]): string {
  return fields
    .map((field) => `- ${field.label} (${field.field}): ${field.value}`)
    .join('\n')
}

function formatRetrievedChunks(chunks: DateValidationCitationInput[]): string {
  return chunks
    .map((chunk, index) => {
      return [
        `Chunk ${index + 1}`,
        `chunkId: ${chunk.chunkId}`,
        `documentName: ${chunk.documentName}`,
        `page: ${chunk.page ?? 'unknown'}`,
        `order: ${chunk.order}`,
        'text:',
        chunk.text
      ].join('\n')
    })
    .join('\n\n---\n\n')
}

export function buildDateValidationPrompt(
  input: BuildDateValidationPromptInput
): string {
  const formFieldsSection = formatFormFields(input.formFields)
  const retrievedChunksSection = formatRetrievedChunks(input.retrievedChunks)

  return [
    'You are validating form-entered contract dates against retrieved document evidence.',
    '',
    'Your job:',
    '- Compare each form field against the retrieved document text',
    '- Use only the provided evidence',
    '- Do not guess',
    '- If the evidence is missing, incomplete, or ambiguous, return "not-enough-evidence"',
    '- Cite only the chunks that support your conclusion',
    '',
    'Return JSON only.',
    'Return an array of objects with this shape:',
    '[',
    '  {',
    '    "field": "contractStartDate",',
    '    "outcome": "match" | "mismatch" | "not-enough-evidence",',
    '    "confidence": "high" | "medium" | "low",',
    '    "message": "short explanation",',
    '    "citations": [',
    '      {',
    '        "chunkId": "string",',
    '        "documentName": "string",',
    '        "page": number | null,',
    '        "order": number',
    '      }',
    '    ]',
    '  }',
    ']',
    '',
    'Form fields:',
    formFieldsSection,
    '',
    'Retrieved document chunks:',
    retrievedChunksSection
  ].join('\n')
}
