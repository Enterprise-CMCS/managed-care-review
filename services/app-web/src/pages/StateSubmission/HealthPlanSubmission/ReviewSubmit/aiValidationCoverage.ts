import type { ValidationStatusQuery } from '../../../../gen/gqlClient'

export type AIValidationCoverageSummary = NonNullable<
    ValidationStatusQuery['validationStatus']['coverageSummary']
>
