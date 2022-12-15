import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isStateUser } from '../domain-models'
import { MutationResolvers, State } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import {
    InsertHealthPlanPackageArgsType,
    isStoreError,
    Store,
} from '../postgres'
import { pluralize } from '../../../app-web/src/common-code/formatters'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from './attributeHelper'

export function createHealthPlanPackageResolver(
    store: Store
): MutationResolvers['createHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('createHealthPlanPackage', user, span)

        // This resolver is only callable by state users
        if (!isStateUser(user)) {
            logError(
                'createHealthPlanPackage',
                'user not authorized to create state data'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to create state data',
                span
            )
            throw new ForbiddenError('user not authorized to create state data')
        }

        const stateFromCurrentUser: State['code'] = user.state_code

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
            logError('createHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'programIDs',
            })
        }

        const insertArgs: InsertHealthPlanPackageArgsType = {
            stateCode: stateFromCurrentUser,
            programIDs: input.programIDs,
            riskBasedContract: input.riskBasedContract,
            submissionDescription: input.submissionDescription,
            submissionType:
                input.submissionType as InsertHealthPlanPackageArgsType['submissionType'],
        }

        const pkgResult = await store.insertHealthPlanPackage(insertArgs)
        if (isStoreError(pkgResult)) {
            const errMessage = `Error creating a package of type ${pkgResult.code}. Message: ${pkgResult.message}`
            logError('createHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        logSuccess('createHealthPlanPackage')
        setSuccessAttributesOnActiveSpan(span)

        return {
            pkg: pkgResult,
        }
    }
}
