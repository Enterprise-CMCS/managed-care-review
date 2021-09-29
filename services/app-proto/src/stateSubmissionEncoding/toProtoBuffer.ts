import { statesubmission } from '../../gen/stateSubmissionProto'
import {
    DraftSubmissionType,
    ActuaryContact,
} from '../../../app-web/src/common-code/domain-models'

/*
    Convert domain date to proto timestamp
*/
const domainDateTimeToProto = (
    domainDateTime: Date
): statesubmission.IStateSubmissionInfo['createdAt'] => {
    return {}
}

/*
    Convert domain date string to proto data 
*/
const domainDateStringToProto = (domainDate: Date): string => {
    return '01-01-1000'
}
/*
    Convert domain enum (e.g. CONTRACT_ONLY) to proto enum (e.g. SUBMISSION_TYPE_CONTRACT_ONLY)
*/
function domainEnumToProto<T>(
    defaultProtoValue: string,
    domainEnum: string
): T {
    const prefix = getEnumPrefix(defaultProtoValue)

    const protoEnumString = `${prefix}_${domainEnum}`
    return protoEnumString as unknown as T
}

/*
    Convert array of domain enums to proto enums 
*/
function domainEnumArrayToProto<T>(
    defaultProtoValue: string,
    domainEnumArray: string[]
): T[] {
    return domainEnumArray.map((enumVal) =>
        domainEnumToProto<T>(defaultProtoValue, enumVal)
    )
}

/* 
Return the prefix for proto enum based on the default value of that field
    - (e.g. return SUBMISSION_TYPE from the default value SUBMISSION_TYPE_UNSPECIFIED)
    - the prefix is a substring of the default value without _UNSPECIFIED
*/
const getEnumPrefix = (defaultValue: string) => {
    const lastUnderscoreIndex = defaultValue.lastIndexOf('_')
    return defaultValue.substring(0, lastUnderscoreIndex)
}

// MAIN
const toProtoBuffer = (domainData: DraftSubmissionType): Uint8Array => {
    const { contractAmendmentInfo, rateAmendmentInfo } = domainData

    const literalMessage: statesubmission.IStateSubmissionInfo = {
        ...domainData,
        createdAt: domainDateTimeToProto(domainData.createdAt),
        updatedAt: domainDateTimeToProto(domainData.updatedAt),
        submissionType: domainEnumToProto<statesubmission.SubmissionType>(
            statesubmission.SubmissionType[0],
            domainData.submissionType
        ),

        stateCode: domainData.stateCode
            ? domainEnumToProto<statesubmission.StateCode>(
                  statesubmission.StateCode[0],
                  domainData.stateCode
              )
            : undefined,
        contractInfo: {
            contractType: domainData.contractType
                ? domainEnumToProto<statesubmission.ContractType>(
                      statesubmission.ContractType[0],
                      domainData.contractType
                  )
                : undefined,
            contractDateStart: domainDateStringToProto(
                domainData.contractDateStart || new Date()
            ),
            contractDateEnd: domainDateStringToProto(
                domainData.contractDateEnd || new Date()
            ),
            managedCareEntities: domainData.managedCareEntities
                ? domainEnumArrayToProto<statesubmission.ManagedCareEntity>(
                      statesubmission.ManagedCareEntity[0],
                      domainData.managedCareEntities
                  )
                : [],
            federalAuthorities: domainData.federalAuthorities
                ? domainEnumArrayToProto<statesubmission.FederalAuthority>(
                      statesubmission.FederalAuthority[0],
                      domainData.federalAuthorities
                  )
                : [],
            contractAmendmentInfo: {
                ...contractAmendmentInfo,
                amendableItems: contractAmendmentInfo?.itemsBeingAmended
                    ? domainEnumArrayToProto<statesubmission.AmendedItem>(
                          'amendableItems',
                          contractAmendmentInfo?.itemsBeingAmended
                      )
                    : undefined,
                capitationRatesAmendedInfo: {
                    ...contractAmendmentInfo?.capitationRatesAmendedInfo,
                    reason: contractAmendmentInfo?.capitationRatesAmendedInfo
                        ?.reason
                        ? domainEnumToProto<statesubmission.CapitationRateAmendmentReason>(
                              'capitationRateAmendmentReason',
                              contractAmendmentInfo?.capitationRatesAmendedInfo
                                  ?.reason
                          )
                        : undefined,
                },
            },
        },
        // 9.21 currently only ever one rate on a domain model, eventually this will be a map
        rateInfos: [
            {
                rateType: domainData.rateType
                    ? domainEnumToProto<statesubmission.RateType>(
                          statesubmission.RateType[0],
                          domainData.rateType
                      )
                    : undefined,
                actuaryContacts: domainData.actuaryContacts
                    ? domainData.actuaryContacts.map((contact) => {
                          return {
                              ...contact,
                              actuaryCommunicationType: domainEnumToProto<
                                  statesubmission.RateInfo['actuaryCommunicationPreference']
                              >(
                                  statesubmission.ActuaryCommunicationType[0],
                                  contact.actuarialFirm || ''
                              ),
                          }
                      }) || []
                    : undefined,
                actuaryCommunicationPreference:
                    domainData.actuaryCommunicationPreference
                        ? domainEnumToProto<statesubmission.ActuaryCommunicationType>(
                              statesubmission.ActuaryCommunicationType[0],
                              domainData.actuaryCommunicationPreference
                          )
                        : undefined,
                ...rateAmendmentInfo,
            },
        ],
    }

    const protoMessage = new statesubmission.StateSubmissionInfo(literalMessage)

    const stateSubmissionMessage =
        statesubmission.StateSubmissionInfo.fromObject(protoMessage)

    return statesubmission.StateSubmissionInfo.encode(
        stateSubmissionMessage
    ).finish()
}
export { toProtoBuffer }
