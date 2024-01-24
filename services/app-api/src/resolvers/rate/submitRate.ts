import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import type { RateFormDataType } from '../../domain-models'
import { isStateUser } from '../../domain-models'
import { logError } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { NotFoundError } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import type { LDService } from '../../launchDarkly/launchDarkly'

export function submitRate(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['submitRate'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        const { rateID, submitReason, formData } = input
        const featureFlags = await launchDarkly.allFlags(context)

        setResolverDetailsOnActiveSpan('submitRate', user, span)
        span?.setAttribute('mcreview.rate_id', rateID)

        // throw error if the feature flag is off
        if (!featureFlags?.['rate-edit-unlock']) {
            const errMessage = `Not authorized to edit and submit a rate independently, the feature is disabled`
            logError('submitRate', errMessage)
            throw new ForbiddenError(errMessage, {
                message: errMessage,
            })
        }

        // This resolver is only callable by State users
        if (!isStateUser(user)) {
            const errMessage = 'user not authorized to submit rate'
            logError('submitRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        // find the rate to submit
        const unsubmittedRate = await store.findRateWithHistory(rateID)

        if (unsubmittedRate instanceof Error) {
            if (unsubmittedRate instanceof NotFoundError) {
                const errMessage = `A rate must exist to be submitted: ${rateID}`
                logError('submitRate', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'rateID',
                })
            }

            logError('submitRate', unsubmittedRate.message)
            setErrorAttributesOnActiveSpan(unsubmittedRate.message, span)
            throw new GraphQLError(unsubmittedRate.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const draftRateRevision = unsubmittedRate.draftRevision

        if (!draftRateRevision) {
            throw new Error(
                'PROGRAMMING ERROR: Status should not be submittable without a draft rate revision'
            )
        }

        // make sure it is draft or unlocked
        if (
            unsubmittedRate.status === 'SUBMITTED' ||
            unsubmittedRate.status === 'RESUBMITTED'
        ) {
            const errMessage = `Attempted to submit a rate that is already submitted`
            logError('submitRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'rateID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        // call submit rate handler
        const submittedRate = await store.submitRate({
            rateID,
            submittedByUserID: user.id,
            submitReason,
            formData: {
                rateType: (formData?.rateType ??
                    undefined) as RateFormDataType['rateType'],
                rateCapitationType: formData?.rateCapitationType ?? undefined,
                rateDocuments: formData?.rateDocuments ?? [],
                supportingDocuments: formData?.supportingDocuments ?? [],
                rateDateStart: formData?.rateDateStart ?? undefined,
                rateDateEnd: formData?.rateDateEnd ?? undefined,
                rateDateCertified: formData?.rateDateCertified ?? undefined,
                amendmentEffectiveDateStart:
                    formData?.amendmentEffectiveDateStart ?? undefined,
                amendmentEffectiveDateEnd:
                    formData?.amendmentEffectiveDateEnd ?? undefined,
                rateProgramIDs: formData?.rateProgramIDs ?? [],
                rateCertificationName:
                    formData?.rateCertificationName ?? undefined,
                certifyingActuaryContacts: formData?.certifyingActuaryContacts
                    ? formData?.certifyingActuaryContacts.map((contact) => ({
                          name: contact.name ?? undefined,
                          titleRole: contact.titleRole ?? undefined,
                          email: contact.email ?? undefined,
                          actuarialFirm: contact.actuarialFirm ?? undefined,
                          actuarialFirmOther:
                              contact.actuarialFirmOther ?? undefined,
                      }))
                    : [],
                addtlActuaryContacts: formData?.addtlActuaryContacts
                    ? formData?.addtlActuaryContacts.map((contact) => ({
                          name: contact.name ?? undefined,
                          titleRole: contact.titleRole ?? undefined,
                          email: contact.email ?? undefined,
                          actuarialFirm: contact.actuarialFirm ?? undefined,
                          actuarialFirmOther:
                              contact.actuarialFirmOther ?? undefined,
                      }))
                    : [],
                actuaryCommunicationPreference:
                    formData?.actuaryCommunicationPreference ?? undefined,
                packagesWithSharedRateCerts:
                    formData?.packagesWithSharedRateCerts ?? [],
            },
        })

        if (submittedRate instanceof Error) {
            const errMessage = `Failed to submit rate with ID: ${rateID}; ${submittedRate.message}`
            logError('submitRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        return {
            rate: submittedRate,
        }
    }
}
