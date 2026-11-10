import type {
    CreateContractInput,
    MutationResolvers,
    State,
} from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { pluralize } from '@mc-review/common-code'
import type { InsertContractArgsType } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import { canSyntheticDataWrite, canWrite } from '../../oauth/oauthAuthorization'
import { parseAndValidateDocuments } from '../documentHelpers'
import { submittableILOSContractFormDataSchema } from '../../domain-models/contractAndRates'

const sharedInsertArgs = (input: CreateContractInput, stateCode: string) => ({
    contractSubmissionType: input.contractSubmissionType,
    stateCode,
    programIDs: input.programIDs,
    submissionDescription: input.submissionDescription,
    submissionType: input.submissionType,
    contractType: input.contractType,
})

// Health plan, EQRO and enrollment broker submissions are created with the same fields.
const healthPlanInsertArgs = (
    input: CreateContractInput,
    stateCode: string
): InsertContractArgsType | GraphQLError => {
    // populationCovered is nullable on the input only because ILOS does not use it.
    if (!input.populationCovered) {
        return createUserInputError(
            `populationCovered is required for ${input.contractSubmissionType} submissions`,
            'populationCovered'
        )
    }

    return {
        ...sharedInsertArgs(input, stateCode),
        populationCovered: input.populationCovered,
        riskBasedContract: input.riskBasedContract ?? undefined,
        managedCareEntities: input.managedCareEntities ?? undefined,
    }
}

// ILOS submissions only carry the ILOS fields. Health plan fields such as
// populationCovered are left unset so the ILOS draft validates on update.
const ilosInsertArgs = (
    input: CreateContractInput,
    stateCode: string
): InsertContractArgsType | GraphQLError => {
    const ilosDocuments = parseAndValidateDocuments(
        input.ilosDocuments?.map((d) => ({
            name: d.name,
            s3URL: d.s3URL,
            sha256: d.sha256,
        })) ?? [],
        'HEALTH_PLAN_DOCS'
    ).map((doc) => ({ ...doc, sha256: doc.sha256! }))

    // The first ILOS form page collects every ILOS field, so all of them are
    // required on create. Later pages save the draft through update, where the
    // draft schema allows them to be unset. submissionType and contractType are
    // prefilled by the client and never user-editable, so the pinned literals
    // are checked here too.
    const ilosFields = submittableILOSContractFormDataSchema
        .pick({
            submissionType: true,
            contractType: true,
            isILOSRatesIncluded: true,
            ilosRateDateStart: true,
            ilosRateDateEnd: true,
            ilosDocuments: true,
        })
        .safeParse({ ...input, ilosDocuments })
    if (!ilosFields.success) {
        const problems = ilosFields.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ')
        return createUserInputError(
            `Invalid ILOS submission fields. ${problems}`,
            String(ilosFields.error.issues[0].path[0])
        )
    }

    return {
        ...sharedInsertArgs(input, stateCode),
        ...ilosFields.data,
    }
}

export function createContract(
    store: Store
): MutationResolvers['createContract'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'createContract',
            undefined,
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (
                    !canWrite(context) &&
                    !canSyntheticDataWrite(context, 'createContract')
                ) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('createContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                // This resolver is only callable by state users
                if (!isStateUser(user)) {
                    const errMessage =
                        'user not authorized to create state data'
                    logResolverError('createContract', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const stateFromCurrentUser: State['code'] = user.stateCode

                const programs = store.findPrograms(
                    stateFromCurrentUser,
                    input.programIDs
                )

                if (programs instanceof Error) {
                    const count = input.programIDs.length
                    const errMessage = `The program ${pluralize(
                        'id',
                        count
                    )} ${input.programIDs.join(', ')} ${pluralize(
                        'does',
                        count
                    )} not exist in state ${stateFromCurrentUser}`
                    logResolverError('createContract', errMessage, context)
                    throw createUserInputError(
                        errMessage,
                        'programIDs',
                        input.programIDs
                    )
                }

                const insertArgs =
                    input.contractSubmissionType === 'ILOS'
                        ? ilosInsertArgs(input, stateFromCurrentUser)
                        : healthPlanInsertArgs(input, stateFromCurrentUser)
                if (insertArgs instanceof GraphQLError) {
                    logResolverError(
                        'createContract',
                        insertArgs.message,
                        context
                    )
                    throw insertArgs
                }

                const contractResult =
                    await store.insertDraftContract(insertArgs)
                if (contractResult instanceof Error) {
                    const errMessage = `Error creating a draft contract. Message: ${contractResult.message}`
                    logResolverError('createContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('createContract', context)

                return {
                    contract: contractResult,
                }
            }
        )
    }
}
