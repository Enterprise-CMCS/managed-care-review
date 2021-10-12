import { statesubmission, google } from '../../gen/stateSubmissionProto'
import {
    DraftSubmissionType,
    ActuaryContact,
} from '../../../app-web/src/common-code/domain-models'

/*
    Convert domain date to proto timestamp
*/
const domainDateToProtoDate = (
    domainDate: Date | undefined
): statesubmission.IStateSubmissionInfo['createdAt'] => {
    if (!domainDate) {
        return undefined
    }

    return {
        day: domainDate.getDate(),
        month: domainDate.getMonth(),
        year: domainDate.getFullYear(),
    }
}

const domainDateToProtoTimestamp = (
    domainDate: Date
): statesubmission.IStateSubmissionInfo['updatedAt'] => {
    const seconds = domainDate.getTime() / 1000
    const nanos = (domainDate.getTime() % 1000) * 1e6
    const timestamp = new google.protobuf.Timestamp({ seconds, nanos })

    return timestamp
}

/*
    Convert domain enum (e.g. CONTRACT_ONLY) to proto enum (e.g. SUBMISSION_TYPE_CONTRACT_ONLY)
*/
function domainEnumToProto(
    defaultProtoValue: string,
    domainEnum: string
): string {
    const prefix = getEnumPrefix(defaultProtoValue)

    const protoEnumString = `${prefix}_${domainEnum}`
    return protoEnumString
}

type StandardEnum<T> = {
    [id: string]: T | string
    [nu: number]: string
}

function betterEnumToProto<T extends StandardEnum<unknown>>(
    domainEnum: string,
    protoEnum: T
) {
    const protoKey = domainEnumToProto(protoEnum[0], domainEnum)

    return protoEnum[protoKey as keyof T]
}

// statesubmission.ContractType[
//                       domainEnumToProto(
//                           statesubmission.ContractType[0],
//                           domainData.contractType
//                       ) as keyof typeof statesubmission.ContractType
//                   ]

/*
    Convert array of domain enums to proto enums 
*/
function domainEnumArrayToProto<T extends StandardEnum<unknown>>(
    protoEnum: T,
    domainEnumArray: string[]
) {
    return domainEnumArray.map((enumVal) =>
        betterEnumToProto<T>(enumVal, protoEnum)
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
        ...domainData, // For this conversion, we  can spread unnecessary fields because protobuf discards of them
        createdAt: domainDateToProtoDate(domainData.createdAt),
        updatedAt: domainDateToProtoTimestamp(domainData.updatedAt),
        submissionType:
            statesubmission.SubmissionType.SUBMISSION_TYPE_CONTRACT_AND_RATES,

        stateCode: domainData.stateCode
            ? statesubmission.StateCode[
                  domainEnumToProto(
                      statesubmission.StateCode[0],
                      domainData.stateCode
                  ) as keyof typeof statesubmission.StateCode
              ]
            : undefined,
        stateNumber: domainData.stateNumber,
        programIds: [domainData.programID],
        contractInfo: {
            contractType: domainData.contractType
                ? betterEnumToProto(
                      domainData.contractType,
                      statesubmission.ContractType
                  )
                : undefined,
            contractDateStart: domainDateToProtoDate(
                domainData.contractDateStart
            ),
            contractDateEnd: domainDateToProtoDate(domainData.contractDateEnd),
            managedCareEntities: domainEnumArrayToProto(
                statesubmission.ManagedCareEntity,
                domainData.managedCareEntities
            ),
            federalAuthorities: domainData.federalAuthorities
                ? domainEnumArrayToProto(
                      statesubmission.FederalAuthority,
                      domainData.federalAuthorities
                  )
                : [],
            contractAmendmentInfo: contractAmendmentInfo
                ? {
                      ...contractAmendmentInfo,
                      relatedToCovid_19:
                          contractAmendmentInfo?.relatedToCovid19,
                      otherAmendableItem:
                          contractAmendmentInfo?.otherItemBeingAmended,
                      amendableItems: contractAmendmentInfo?.itemsBeingAmended
                          ? domainEnumArrayToProto(
                                statesubmission.AmendedItem,
                                contractAmendmentInfo?.itemsBeingAmended
                            )
                          : undefined,
                      capitationRatesAmendedInfo: {
                          ...contractAmendmentInfo?.capitationRatesAmendedInfo,
                          reason: contractAmendmentInfo
                              ?.capitationRatesAmendedInfo?.reason
                              ? betterEnumToProto(
                                    contractAmendmentInfo
                                        ?.capitationRatesAmendedInfo?.reason,
                                    statesubmission.CapitationRateAmendmentReason
                                )
                              : undefined,
                      },
                  }
                : undefined,
        },
        // 9.21 currently only ever one rate on a domain model, eventually this will be a map
        rateInfos: [
            {
                rateType: domainData.rateType
                    ? betterEnumToProto(
                          domainData.rateType,
                          statesubmission.RateType
                      )
                    : undefined,
                rateDateStart: domainDateToProtoDate(domainData.rateDateStart),
                rateDateEnd: domainDateToProtoDate(domainData.rateDateEnd),
                rateDateCertified: domainDateToProtoDate(
                    domainData.rateDateCertified
                ),
                actuaryContacts: domainData.actuaryContacts.map(
                    (actuaryContact) => {
                        const firmType = actuaryContact.actuarialFirm
                            ? betterEnumToProto(
                                  actuaryContact.actuarialFirm,
                                  statesubmission.ActuarialFirmType
                              )
                            : undefined

                        return {
                            contact: {
                                name: actuaryContact.name,
                                titleRole: actuaryContact.titleRole,
                                email: actuaryContact.email,
                            },
                            actuarialFirmType: firmType,
                            actuarialFirmOther:
                                actuaryContact.actuarialFirmOther,
                        }
                    }
                ),
                rateAmendmentInfo: rateAmendmentInfo && {
                    effectiveDateStart: domainDateToProtoDate(
                        rateAmendmentInfo.effectiveDateStart
                    ),
                    effectiveDateEnd: domainDateToProtoDate(
                        rateAmendmentInfo.effectiveDateEnd
                    ),
                },
                actuaryCommunicationPreference:
                    domainData.actuaryCommunicationPreference
                        ? betterEnumToProto(
                              domainData.actuaryCommunicationPreference,
                              statesubmission.ActuaryCommunicationType
                          )
                        : undefined,
            },
        ],
        documents: domainData.documents.map((doc) => ({
            s3Url: doc.s3URL,
            name: doc.name,
        })),
    }

    console.log(
        'rateinfo',
        domainData.rateType,
        betterEnumToProto(
            domainData.rateType || 'AMENDMENT',
            statesubmission.RateType
        )
    )
    console.log('proto is ', JSON.stringify(literalMessage.rateInfos))

    const protoMessage = new statesubmission.StateSubmissionInfo(literalMessage)

    const stateSubmissionMessage =
        statesubmission.StateSubmissionInfo.fromObject(protoMessage)

    return statesubmission.StateSubmissionInfo.encode(
        stateSubmissionMessage
    ).finish()
}
export { toProtoBuffer }
