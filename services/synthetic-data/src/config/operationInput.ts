import { z } from 'zod'

export const MAX_SCALE = 10

const appendProfileSchema = z.enum([
    'representative-volume-v1',
    'linked-rates-v1',
    'lifecycle-v1',
    'q-and-a-v1',
    'boundary-stress-v1',
    'rolling-v1',
])
const profileSchema = z.union([z.literal('baseline-v1'), appendProfileSchema])
const scaleSchema = z.coerce.number().int().positive().max(MAX_SCALE)
const commonFields = {
    scale: scaleSchema,
    seed: z.string().min(1).optional(),
}

const operationInputSchema = z.discriminatedUnion('operation', [
    z
        .object({
            operation: z.literal('reset-and-seed'),
            profile: z.literal('baseline-v1'),
            confirmation: z.literal('RESET_QA'),
            ...commonFields,
        })
        .strict(),
    z
        .object({
            operation: z.literal('append'),
            profile: appendProfileSchema,
            ...commonFields,
        })
        .strict(),
    z
        .object({
            operation: z.literal('verify'),
            profile: profileSchema,
            ...commonFields,
        })
        .strict(),
])

const reviewSeedInputSchema = z
    .object({
        seed: z
            .string()
            .trim()
            .min(1)
            .max(64)
            .regex(/^[A-Za-z0-9._-]+$/),
    })
    .strict()

export type OperationInput = z.infer<typeof operationInputSchema>
export type ReviewSeedInput = z.infer<typeof reviewSeedInputSchema>

export class OperationInputError extends Error {
    readonly issues: ReadonlyArray<string>

    constructor(issues: ReadonlyArray<string>) {
        super(`Invalid synthetic-data operation input: ${issues.join('; ')}`)
        this.name = 'OperationInputError'
        this.issues = issues
    }
}

function parseNamedArguments(
    args: ReadonlyArray<string>
): Record<string, string> {
    const values: Record<string, string> = {}

    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index]
        if (!argument.startsWith('--')) {
            throw new OperationInputError([
                `Expected a named argument, received ${argument}`,
            ])
        }

        const equalsIndex = argument.indexOf('=')
        const key = argument.slice(
            2,
            equalsIndex === -1 ? undefined : equalsIndex
        )
        const value =
            equalsIndex === -1
                ? args[index + 1]
                : argument.slice(equalsIndex + 1)

        if (!key || !value || value.startsWith('--')) {
            throw new OperationInputError([`Missing value for --${key}`])
        }
        if (values[key] !== undefined) {
            throw new OperationInputError([`Duplicate argument --${key}`])
        }

        values[key] = value
        if (equalsIndex === -1) {
            index += 1
        }
    }

    return values
}

export function parseOperationInput(
    args: ReadonlyArray<string>
): OperationInput {
    const result = operationInputSchema.safeParse(parseNamedArguments(args))
    if (!result.success) {
        throw new OperationInputError(
            result.error.issues.map(
                (issue) => `${issue.path.join('.')}: ${issue.message}`
            )
        )
    }

    return result.data
}

export function parseReviewSeedInput(
    args: ReadonlyArray<string>
): ReviewSeedInput {
    const result = reviewSeedInputSchema.safeParse(parseNamedArguments(args))
    if (!result.success) {
        throw new OperationInputError(
            result.error.issues.map(
                (issue) => `${issue.path.join('.')}: ${issue.message}`
            )
        )
    }

    return result.data
}
