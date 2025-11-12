import { z } from 'zod'

//This is here due to a circular dependency issue caused by originally having this in the baseContractRateTypes.ts file
//Had to move it to it's own file to resolve the issue
export const contractSubmissionTypeSchema = z.union([
    z.literal('HEALTH_PLAN'),
    z.literal('EQRO'),
])
