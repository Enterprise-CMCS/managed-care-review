import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isStateUser } from '../../app-web/src/common-code/domain-models'
import { MutationResolvers, State } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { InsertDraftSubmissionArgsType, isStoreError, Store } from '../postgres'
import { pluralize } from '../../app-web/src/common-code/formatters'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from './attributeHelper'
import { toDomain } from '../../app-web/src/common-code/proto/stateSubmission'

export function createDraftSubmissionResolver(
    store: Store
): MutationResolvers['createDraftSubmission'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('createDraftSubmission', user, span)

        // This resolver is only callable by state users
        if (!isStateUser(user)) {
            logError(
                'createDraftSubmission',
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

        if (
            programs === undefined ||
            programs.length !== input.programIDs.length
        ) {
            const count = input.programIDs.length
            const errMessage = `The program ${pluralize(
                'id',
                count
            )} ${input.programIDs.join(', ')} ${pluralize(
                'does',
                count
            )} not exist in state ${stateFromCurrentUser}`
            logError('createDraftSubmission', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'programIDs',
            })
        }

        const dbDraftSubmission: InsertDraftSubmissionArgsType = {
            stateCode: stateFromCurrentUser,
            programIDs: input.programIDs,
            submissionDescription: input.submissionDescription,
            submissionType:
                input.submissionType as InsertDraftSubmissionArgsType['submissionType'],
        }

        const pkgResult = await store.insertDraftSubmission(dbDraftSubmission)
        if (isStoreError(pkgResult)) {
            const errMessage = `Issue creating a draft submission of type ${pkgResult.code}. Message: ${pkgResult.message}`
            logError('createDraftSubmission', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        logSuccess('createDraftSubmission')
        setSuccessAttributesOnActiveSpan(span)

        const revision = pkgResult.revisions[0]
        const formDataResult = toDomain(revision.formDataProto)
        if (formDataResult instanceof Error) {
            const errMessage =
                'Failed to deserialize form data after create' +
                formDataResult.message
            logError('createDraftSubmission', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw formDataResult
        }

        if (formDataResult.status === 'SUBMITTED') {
            const errMessage =
                'managed to get a submitted package after creation: ' +
                formDataResult.id
            logError('createDraftSubmission', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw formDataResult
        }

        return {
            draftSubmission: formDataResult,
        }
    }
}
