import { z } from 'zod'

const statusSchema = z.union([
    z.literal('SUBMITTED'),
    z.literal('DRAFT'),
    z.literal('UNLOCKED'),
    z.literal('RESUBMITTED'),
])

const unlockedContractStatusSchema = z.union([
    z.literal('DRAFT'),
    z.literal('UNLOCKED'),
])

export { statusSchema, unlockedContractStatusSchema }
