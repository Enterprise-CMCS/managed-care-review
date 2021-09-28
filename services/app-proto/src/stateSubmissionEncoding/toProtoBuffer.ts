import { statesubmission } from '../../gen/stateSubmissionProto'
import {
    DraftSubmissionType,
    ActuaryContact,
} from '../../../app-web/src/common-code/domain-models'
import { ConnectContactLens } from 'aws-sdk'

// Add adaptors for dates
function camelToUnderscore(str: string) {
    var result = str.replace(/([A-Z])/g, ' $1')
    return result.split(' ').join('_').toLowerCase()
}

const domainEnumToProto = (
    domainKey: string,
    domainEnum?: string
): string | undefined =>
    domainEnum
        ? `${camelToUnderscore(domainKey).toUpperCase()}_${domainEnum}`
        : undefined

const domainEnumArrayToProto = (
    domainKey: string,
    domainEnumArray?: string[]
): string[] =>
    domainEnumArray
        ? domainEnumArray.map(
              (enumVal) => domainEnumToProto(domainKey, enumVal) || 'ERROR'
          )
        : []

const modifiedActuaryContacts = (
    actuaryContactsArray: ActuaryContact[]
): any[] =>
    actuaryContactsArray.map((contact) => {
        return {
            ...contact,
            actuaryCommunicationType: domainEnumToProto(
                'actuaryCommunicationType',
                contact.actuarialFirm
            ),
        }
    }) || []

const toProtoBuffer = (domainData: DraftSubmissionType): Uint8Array => {
    const { contractAmendmentInfo, rateAmendmentInfo } = domainData
    const modifiedContractAmendmentInfo = {
        ...contractAmendmentInfo,
        amendableItems: domainEnumArrayToProto(
            'amendableItems',
            contractAmendmentInfo?.itemsBeingAmended
        ),
        capitationRatesAmendedInfo: {
            ...contractAmendmentInfo?.capitationRatesAmendedInfo,
            reason: domainEnumToProto(
                'capitationRateAmendmentReason',
                contractAmendmentInfo?.capitationRatesAmendedInfo?.reason
            ),
        },
    }
    const modifiedRateAmendmentInfo = {
        ...rateAmendmentInfo,
        rateType: domainEnumToProto('rateType', domainData.rateType),
        actuaryContacts: modifiedActuaryContacts,
        actuaryCommunicationPreference: domainEnumToProto(
            'actuaryCommunicationType',
            domainData.rateType
        ),
    }
    const modified = {
        ...domainData,
        submissionType: domainEnumToProto(
            'submissionType',
            domainData.submissionType
        ),
        contractType: domainEnumToProto(
            'contractType',
            domainData.contractType
        ),
        managedCareEntities: domainEnumToProto(
            'managedCareEntities',
            domainData.contractType
        ),
        federalAuthorities: domainEnumToProto(
            'federalAuthorities',
            domainData.contractType
        ),
        stateCode: domainEnumToProto('stateCode', domainData.contractType),
        contractAmendmentInfo: modifiedContractAmendmentInfo,
        rateInfos: [modifiedRateAmendmentInfo],
    }
    const stateSubmissionMessage =
        statesubmission.StateSubmissionInfo.fromObject(modified)
    console.log(stateSubmissionMessage)
    return statesubmission.StateSubmissionInfo.encode(
        stateSubmissionMessage
    ).finish()
}
export { toProtoBuffer }
