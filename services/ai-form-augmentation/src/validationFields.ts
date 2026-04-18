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
      /\bCONTRACT START DATE\b/i,
      /\bTHE CONTRACT WILL BECOME EFFECTIVE\b/i,
      /\bTERM BEGINS ON\b/i,
      /\bTERM STARTS ON\b/i
    ],
    messageLabel: 'start date',
    retrievalQuery:
      'START DATE CONTRACT START DATE the contract will become effective term begins on term of this contract term of this agreement amended to read deemed to read superseding replacement'
  },
  contractEndDate: {
    labelPatterns: [
      /\bTHROUGH END DATE\b/i,
      /\bEND DATE\b/i,
      /\bCURRENT CONTRACT EXPIRATION DATE\b/i,
      /\bREQUESTED CONTRACT EXPIRATION DATE\b/i,
      /\bORIGINAL CONTRACT EXPIRATION DATE\b/i,
      /\bCONTINUE IN FULL FORCE AND EFFECT THROUGH\b/i,
      /\bTERM ENDS ON\b/i,
      /\bTERM EXPIRES ON\b/i
    ],
    messageLabel: 'end date',
    retrievalQuery:
      'contract end date through end date current contract expiration date requested contract expiration date original contract expiration date continue in full force and effect through term ends expiration date term of this contract term of this agreement amended to read deemed to read superseding replacement notwithstanding'
  },
  amendmentEffectiveDate: {
    labelPatterns: [/Amendment effective date\s*:/i],
    messageLabel: 'amendment effective date',
    retrievalQuery: 'amendment effective date'
  }
}
