import type { DateValidationFieldInput } from './prompts'

type SupportedField = DateValidationFieldInput['field']

export const VALIDATION_FIELD_CONFIG: Record<
  SupportedField,
  {
    labelPatterns: RegExp[]
    messageLabel: string
    retrievalQuery: string
  }
> = {
  contractStartDate: {
    labelPatterns: [
      /\bSTART DATE\b/i,
      /\bTERM BEGINS ON\b/i,
      /\bTERM STARTS ON\b/i
    ],
    messageLabel: 'start date',
    retrievalQuery:
      'START DATE contract term of this agreement effective date begins on'
  },
  contractEndDate: {
    labelPatterns: [
      /\bTHROUGH END DATE\b/i,
      /\bEND DATE\b/i,
      /\bTERM ENDS ON\b/i,
      /\bTERM EXPIRES ON\b/i
    ],
    messageLabel: 'end date',
    retrievalQuery: 'contract end date through end date term ends expiration date'
  },
  amendmentEffectiveDate: {
    labelPatterns: [/Amendment effective date\s*:/i],
    messageLabel: 'amendment effective date',
    retrievalQuery: 'amendment effective date'
  }
}
