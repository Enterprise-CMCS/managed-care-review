import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError } from './storeError'
import {
    convertToDomainSubmission,
    CapitationRatesAmendedInfo,
    RateAmendmentInfoT,
    ContractAmendmentInfoT,
    DocumentStoreT,
    SubmissionStoreType,
    isDynamoError,
} from './dynamoTypes'

import {
    DraftSubmissionType,
    isDraftSubmission,
} from '../../app-web/src/common-code/domain-models'

export async function updateDraftSubmission(
    mapper: DataMapper,
    draftSubmission: DraftSubmissionType
): Promise<DraftSubmissionType | StoreError> {
    const storeDraft = new SubmissionStoreType()

    storeDraft.id = draftSubmission.id
    storeDraft.createdAt = draftSubmission.createdAt
    storeDraft.updatedAt = new Date()

    // these args carry over but aren't set explicitly
    storeDraft.stateCode = draftSubmission.stateCode
    storeDraft.stateNumber = draftSubmission.stateNumber

    // SOME args can be set, others must be kept
    storeDraft.submissionType = draftSubmission.submissionType
    storeDraft.programID = draftSubmission.programID
    storeDraft.submissionDescription = draftSubmission.submissionDescription
    storeDraft.contractDateEnd = draftSubmission.contractDateEnd
    storeDraft.contractDateStart = draftSubmission.contractDateStart
    storeDraft.contractType = draftSubmission.contractType
    storeDraft.federalAuthorities = draftSubmission.federalAuthorities
    storeDraft.managedCareEntities = draftSubmission.managedCareEntities
    storeDraft.rateDateEnd = draftSubmission.rateDateEnd
    storeDraft.rateDateStart = draftSubmission.rateDateStart
    storeDraft.rateType = draftSubmission.rateType
    storeDraft.rateDateCertified = draftSubmission.rateDateCertified
    storeDraft.stateContacts = draftSubmission.stateContacts
    storeDraft.actuaryContacts = draftSubmission.actuaryContacts
    storeDraft.actuaryCommunicationPreference = draftSubmission.actuaryCommunicationPreference

    if (draftSubmission.contractAmendmentInfo) {
        const draftInfo = draftSubmission.contractAmendmentInfo

        const info = new ContractAmendmentInfoT()
        info.itemsBeingAmended = draftInfo.itemsBeingAmended
        info.otherItemBeingAmended = draftInfo.otherItemBeingAmended

        if (draftInfo.capitationRatesAmendedInfo) {
            const capRates = new CapitationRatesAmendedInfo()
            capRates.reason = draftInfo.capitationRatesAmendedInfo.reason
            capRates.otherReason =
                draftInfo.capitationRatesAmendedInfo.otherReason

            info.capitationRatesAmendedInfo = capRates
        }

        info.relatedToCovid19 = draftInfo.relatedToCovid19
        info.relatedToVaccination = draftInfo.relatedToVaccination

        storeDraft.contractAmendmentInfo = info
    }

    if (draftSubmission.rateAmendmentInfo) {
        const draftInfo = draftSubmission.rateAmendmentInfo

        const info = new RateAmendmentInfoT()
        info.effectiveDateStart = draftInfo.effectiveDateStart
        info.effectiveDateEnd = draftInfo.effectiveDateEnd
        storeDraft.rateAmendmentInfo = info
    }

    draftSubmission.documents.forEach((doc) => {
        const storeDocument = new DocumentStoreT()
        storeDocument.name = doc.name
        storeDocument.s3URL = doc.s3URL
        storeDraft.documents.push(storeDocument)
    })

    try {
        const putResult = await mapper.put(storeDraft)

        const domainResult = convertToDomainSubmission(putResult)

        // if the result in the DB is a DRAFT, return an error
        if (!isDraftSubmission(domainResult)) {
            return {
                code: 'WRONG_STATUS',
                message: 'The updated submission is not a DraftSubmission',
            }
        }

        return domainResult
    } catch (err) {
        if (isDynamoError(err)) {
            if (
                err.code === 'UnknownEndpoint' ||
                err.code === 'NetworkingError'
            ) {
                return {
                    code: 'CONNECTION_ERROR',
                    message:
                        'Failed to connect to the database when trying to insert a new Submission',
                }
            }
        }
        console.log(
            'VERY unexpected insert a new Submission, unknown error: ',
            err
        )
        throw err
    }
}
