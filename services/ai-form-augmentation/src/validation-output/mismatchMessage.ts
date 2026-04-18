import type { DateValidationFieldInput } from '../prompts'
import { VALIDATION_FIELD_CONFIG } from '../validationFields'

export function buildFieldSpecificMismatchMessage(args: {
  field: DateValidationFieldInput
  documentDate: string
  formDate: string
}): string {
  const fieldLabel = VALIDATION_FIELD_CONFIG[args.field.field].messageLabel

  return `Document ${fieldLabel} (${args.documentDate}) does not match form ${fieldLabel} (${args.formDate}).`
}
