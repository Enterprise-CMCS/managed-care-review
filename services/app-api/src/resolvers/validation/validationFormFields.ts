import { formatCalendarDate } from '@mc-review/dates'
import type { DateValidationFieldInput } from '../../../../ai-form-augmentation/src/prompts'

export function buildValidationFormFields(formData: {
    contractDateStart?: Date
    contractDateEnd?: Date
}): DateValidationFieldInput[] {
    const fields: DateValidationFieldInput[] = []

    if (formData.contractDateStart) {
        // Serialize dates once at the API boundary so the worker always receives
        // stable prompt-ready values instead of mixing Date formatting concerns
        // into the document-processing runtime.
        fields.push({
            field: 'contractStartDate',
            label: 'Contract Start Date',
            value: formatCalendarDate(formData.contractDateStart, 'UTC'),
        })
    }

    if (formData.contractDateEnd) {
        fields.push({
            field: 'contractEndDate',
            label: 'Contract End Date',
            value: formatCalendarDate(formData.contractDateEnd, 'UTC'),
        })
    }

    return fields
}
