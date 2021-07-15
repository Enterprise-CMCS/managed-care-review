import { DataMapper } from '@aws/dynamodb-data-mapper'

import { StoreError, convertDynamoErrorToStoreError } from './storeError'
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
    isStateSubmission,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'

// Initially called when we convert a draft submission to a state submission
export async function updateStateSubmission(
    mapper: DataMapper,
    stateSubmission: StateSubmissionType
): Promise<StateSubmissionType | StoreError> {
    const storeSubmission = new SubmissionStoreType()
    storeSubmission.id = stateSubmission.id
    storeSubmission.status = 'SUBMITTED'
    storeSubmission.createdAt = stateSubmission.createdAt
    storeSubmission.updatedAt = new Date()
    storeSubmission.stateCode = stateSubmission.stateCode
    storeSubmission.stateNumber = stateSubmission.stateNumber
    storeSubmission.submissionType = stateSubmission.submissionType
    storeSubmission.programID = stateSubmission.programID
    storeSubmission.submissionDescription =
        stateSubmission.submissionDescription

    stateSubmission.documents.forEach((doc) => {
        const storeDocument = new DocumentStoreT()
        storeDocument.name = doc.name
        storeDocument.s3URL = doc.s3URL
        storeSubmission.documents.push(storeDocument)
    })

    storeSubmission.stateContactName = stateSubmission.stateContactName
    storeSubmission.stateContactTitleRole = stateSubmission.stateContactTitleRole
    storeSubmission.stateContactEmail = stateSubmission.stateContactEmail
    storeSubmission.stateContactPhone = stateSubmission.stateContactPhone 

    storeSubmission.contractType = stateSubmission.contractType
    storeSubmission.contractDateStart = stateSubmission.contractDateStart
    storeSubmission.contractDateEnd = stateSubmission.contractDateEnd
    storeSubmission.managedCareEntities = stateSubmission.managedCareEntities
    storeSubmission.federalAuthorities = stateSubmission.federalAuthorities

    storeSubmission.rateType = stateSubmission.rateType
    storeSubmission.rateDateStart = stateSubmission.rateDateStart
    storeSubmission.rateDateEnd = stateSubmission.rateDateEnd
    storeSubmission.rateDateCertified = stateSubmission.rateDateCertified

    if (stateSubmission.contractAmendmentInfo) {
        const draftInfo = stateSubmission.contractAmendmentInfo

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

        storeSubmission.contractAmendmentInfo = info
    }

    if (stateSubmission.rateAmendmentInfo) {
        const draftInfo = stateSubmission.rateAmendmentInfo

        const info = new RateAmendmentInfoT()
        info.effectiveDateStart = draftInfo.effectiveDateStart
        info.effectiveDateEnd = draftInfo.effectiveDateEnd
        storeSubmission.rateAmendmentInfo = info
    }
    // State submission only field
    storeSubmission.submittedAt = stateSubmission.submittedAt

    try {
        const putResult = await mapper.put(storeSubmission)

        const domainResult = convertToDomainSubmission(putResult)

        if (!isStateSubmission(domainResult)) {
            return {
                code: 'WRONG_STATUS',
                message: 'the updated submission is not a StateSubmission',
            }
        }

        return domainResult
    } catch (err) {
        if (isDynamoError(err)) {
            return convertDynamoErrorToStoreError(err.code)
        }
        throw new Error(`Unexpected - ${err}`)
    }
}
