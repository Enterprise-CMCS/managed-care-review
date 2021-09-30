import { statesubmission } from '../../gen/stateSubmissionProto'
import {
    DraftSubmissionType,
    StateSubmissionType,
} from '../../../app-web/src/common-code/domain-models'

type GenericSubmissionType = DraftSubmissionType | StateSubmissionType
/*
    Convert proto timestamp to domain date
*/
const protoDateTimeToDomain = (
    protoDateTime: statesubmission.IStateSubmissionInfo['createdAt']
): Date => {
    return new Date()
}

/*
    Convert proto date string to domain data string
*/
const protoDateStringToDomain = (protoDate: Date): string => {
    return '01-01-1000'
}
/*
    Convert proto enum (e.g. SUBMISSION_TYPE_CONTRACT_ONLY) to domain enum (e.g. CONTRACT_ONLY)
*/
function protoEnumToDomain<T>(defaultProtoValue: string, protoEnum: string): T {
    const protoEnumString = removeEnumPrefix(defaultProtoValue, protoEnum)

    return protoEnumString as unknown as T
}

/*
    Convert array of proto enums to domain enums 
*/
function protoEnumArrayToDomain<T>(
    defaultProtoValue: string,
    protoEnumArray: string[]
): T[] {
    return protoEnumArray.map((enumVal) =>
        protoEnumToDomain<T>(defaultProtoValue, enumVal)
    )
}

/* 
Remove the proto enum prefix using the default value of that field
    - (e.g. return SUBMISSION_TYPE from the default value SUBMISSION_TYPE_UNSPECIFIED)
*/
function removeEnumPrefix(defaultValue: string, protoEnum: string): string {
    const lastUnderscoreIndex = defaultValue.lastIndexOf('_')
    const prefix = defaultValue.substring(0, lastUnderscoreIndex)
    return protoEnum.replace(prefix, '')
}
const toDomain = (
    buff: Uint8Array
): GenericSubmissionType | StateSubmissionType => {
    const stateSubmissionMessage =
        statesubmission.StateSubmissionInfo.decode(buff)

    const {
        id,
        createdAt,
        updatedAt,
        submissionStatus,
        stateCode,
        stateNumber,
        programIds,
        submissionType,
        submissionDescription,
        stateContacts,
        contractInfo,
        documents,
        rateInfos,
    } = stateSubmissionMessage
    const domainModel: GenericSubmissionType = {
        id: id,
        status: submissionStatus,
        createdAt: protoDateTimeToDomain(createdAt),
        updatedAt: protoDateTimeToDomain(updatedAt),
        submissionType: protoEnumToDomain<
            GenericSubmissionType['submissionType']
        >(
            statesubmission.SubmissionType[0],
            submissionType as unknown as string // type coercion bc we know these fields cannot be undefined
        ),

        stateCode: protoEnumToDomain<GenericSubmissionType['stateCode']>(
            statesubmission.StateCode[0],
            stateCode as unknown as string // type coercion bc we know these fields cannot be undefined
        ),
        submissionDescription: submissionDescription,

        contractType: stateSubmissionMessage?.contractInfo?.contractType
            ? protoEnumToDomain<GenericSubmissionType['contractType']>(
                  statesubmission.ContractType[0],
                  stateSubmissionMessage?.contractInfo?.contractType
              )
            : undefined,

        contractDateStart: protoDateStringToDomain(
            stateSubmissionMessage?.contractInfo?.contractDateStart
        ),
        contractDateEnd: protoDateStringToDomain(
            stateSubmissionMessage?.contractInfo?.contractDateEnd
        ),
        managedCareEntities: stateSubmissionMessage?.contractInfo
            ?.managedCareEntities
            ? protoEnumArrayToDomain<statesubmission.ManagedCareEntity>(
                  statesubmission.ManagedCareEntity[0],
                  stateSubmissionMessage?.contractInfo?.managedCareEntities
              )
            : [],
        federalAuthorities: stateSubmissionMessage?.contractInfo
            ?.federalAuthorities
            ? protoEnumArrayToDomain<statesubmission.FederalAuthority>(
                  statesubmission.FederalAuthority[0],
                  stateSubmissionMessage?.contractInfo?.federalAuthorities
              )
            : [],
        contractAmendmentInfo: {
            ...contractAmendmentInfo,
            amendableItems: contractAmendmentInfo?.itemsBeingAmended
                ? protoEnumArrayToDomain<statesubmission.AmendedItem>(
                      'amendableItems',
                      contractAmendmentInfo?.itemsBeingAmended
                  )
                : undefined,
            capitationRatesAmendedInfo: {
                ...contractAmendmentInfo?.capitationRatesAmendedInfo,
                reason: contractAmendmentInfo?.capitationRatesAmendedInfo
                    ?.reason
                    ? protoEnumToDomain<statesubmission.CapitationRateAmendmentReason>(
                          'capitationRateAmendmentReason',
                          contractAmendmentInfo?.capitationRatesAmendedInfo
                              ?.reason
                      )
                    : undefined,
            },
        },

        // TO DO -  MAP THROUGH WHATEVER IS IN RATE INFO
        rateInfos: [
            {
                rateType: stateSubmissionMessage.rateType
                    ? protoEnumToDomain<statesubmission.RateType>(
                          statesubmission.RateType[0],
                          stateSubmissionMessage.rateType
                      )
                    : undefined,
                actuaryContacts: stateSubmissionMessage.actuaryContacts
                    ? stateSubmissionMessage.actuaryContacts.map((contact) => {
                          return {
                              ...contact,
                              actuaryCommunicationType: protoEnumToDomain<
                                  statesubmission.RateInfo['actuaryCommunicationPreference']
                              >(
                                  statesubmission.ActuaryCommunicationType[0],
                                  contact.actuarialFirm || ''
                              ),
                          }
                      }) || []
                    : undefined,
                actuaryCommunicationPreference:
                    stateSubmissionMessage.actuaryCommunicationPreference
                        ? protoEnumToDomain<statesubmission.ActuaryCommunicationType>(
                              statesubmission.ActuaryCommunicationType[0],
                              stateSubmissionMessage.actuaryCommunicationPreference
                          )
                        : undefined,
                ...rateAmendmentInfo,
            },
        ],
    }

    return domainModel
}

export { toDomain }
