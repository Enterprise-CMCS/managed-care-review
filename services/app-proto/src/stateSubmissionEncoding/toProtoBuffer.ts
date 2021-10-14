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
    domainEnum: string | undefined,
    protoEnum: T
) {
    if (!domainEnum) {
        return undefined
    }

    const protoKey = domainEnumToProto(protoEnum[0], domainEnum)

    return protoEnum[protoKey as keyof T]
}

/*
    Convert array of domain enums to proto enums 
*/
function domainEnumArrayToProto<T extends StandardEnum<unknown>>(
    protoEnum: T,
    domainEnumArray: string[]
) {
    const enums = []

    for (const domainEnum of domainEnumArray) {
        const penum = betterEnumToProto<T>(domainEnum, protoEnum)
        if (penum) {
            enums.push(penum)
        }
    }

    return enums
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
        // protoName and Version are for internal proto use only
        // We aren't really using them yet but in the future it will be possible
        // to differentiate between different versions of different messages
        // changes to the proto file at some point will require incremeting "proto version"
        protoName: 'STATE_SUBMISSION',
        protoVersion: 1,

        ...domainData, // For this conversion, we  can spread unnecessary fields because protobuf discards of them
        createdAt: domainDateToProtoDate(domainData.createdAt),
        updatedAt: domainDateToProtoTimestamp(domainData.updatedAt),
        submissionType: betterEnumToProto(
            domainData.submissionType,
            statesubmission.SubmissionType
        ),

        stateCode: betterEnumToProto(
            domainData.stateCode,
            statesubmission.StateCode
        ),

        stateNumber: domainData.stateNumber,
        // eventually this will need to be an array of ids
        programIds: [domainData.programID],
        contractInfo: {
            contractType: betterEnumToProto(
                domainData.contractType,
                statesubmission.ContractType
            ),
            contractDateStart: domainDateToProtoDate(
                domainData.contractDateStart
            ),
            contractDateEnd: domainDateToProtoDate(domainData.contractDateEnd),
            managedCareEntities: domainEnumArrayToProto(
                statesubmission.ManagedCareEntity,
                domainData.managedCareEntities
            ),
            federalAuthorities: domainEnumArrayToProto(
                statesubmission.FederalAuthority,
                domainData.federalAuthorities
            ),
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
                          reason: betterEnumToProto(
                              contractAmendmentInfo?.capitationRatesAmendedInfo
                                  ?.reason,
                              statesubmission.CapitationRateAmendmentReason
                          ),
                      },
                  }
                : undefined,
        },
        // 9.21 currently only ever one rate on a domain model, eventually this will be a map
        rateInfos: [
            {
                rateType: betterEnumToProto(
                    domainData.rateType,
                    statesubmission.RateType
                ),
                rateDateStart: domainDateToProtoDate(domainData.rateDateStart),
                rateDateEnd: domainDateToProtoDate(domainData.rateDateEnd),
                rateDateCertified: domainDateToProtoDate(
                    domainData.rateDateCertified
                ),
                actuaryContacts: domainData.actuaryContacts.map(
                    (actuaryContact) => {
                        const firmType = betterEnumToProto(
                            actuaryContact.actuarialFirm,
                            statesubmission.ActuarialFirmType
                        )

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
                actuaryCommunicationPreference: betterEnumToProto(
                    domainData.actuaryCommunicationPreference,
                    statesubmission.ActuaryCommunicationType
                ),
            },
        ],
        documents: domainData.documents.map((doc) => ({
            s3Url: doc.s3URL,
            name: doc.name,
        })),
    }

    const protoMessage = new statesubmission.StateSubmissionInfo(literalMessage)

    const stateSubmissionMessage =
        statesubmission.StateSubmissionInfo.fromObject(protoMessage)

    return statesubmission.StateSubmissionInfo.encode(
        stateSubmissionMessage
    ).finish()
}
export { toProtoBuffer }
