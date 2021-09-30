import { statesubmission } from '../../gen/stateSubmissionProto'
import {
    DraftSubmissionType,
    StateSubmissionType,
} from '../../../app-web/src/common-code/domain-models'

type GenericSubmissionType = DraftSubmissionType | StateSubmissionType
/*
    Convert proto timestamp to domain date
*/
const protoTimestampToDomain = (
    protoDateTime: statesubmission.IStateSubmissionInfo['createdAt']
): Date => {
    return protoDateTime
}

/*
    Convert proto date string to domain data string
*/
const protoDateToDomain = (protoDate: statesubmission.Date): Date => {
    return new Date(protoDate.year, protoDate.month, protoDate.day)
}
/*
    Convert proto enum (e.g. SUBMISSION_TYPE_CONTRACT_ONLY) to domain enum (e.g. CONTRACT_ONLY)
*/
function protoEnumToDomain(
    defaultProtoValue: string,
    protoEnum: string
): string {
    const protoEnumString = removeEnumPrefix(defaultProtoValue, protoEnum)
    return protoEnumString
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
// TO CONSIDER: determine what type we have - draft submission or state submission and construct accordingly
const toDomain = (buff: Uint8Array): DraftSubmissionType | Error => {
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
    const domainModel: DraftSubmissionType = {
        id: id,
        // status:
        //     submissionStatus ===
        //     statesubmission.SubmissionStatus.SUBMISSION_STATUS_DRAFT
        //         ? 'DRAFT'
        //         : 'SUBMITTED',
        createdAt: protoDateToDomain(createdAt),
        updatedAt: protoTimestampToDomain(updatedAt),
        submissionType: protoEnumToDomain(
            statesubmission.SubmissionType[0],
            statesubmission.SubmissionType[submissionType]
        ) as DraftSubmissionType['submissionType'],

        stateCode: protoEnumToDomain(
            statesubmission.StateCode[0],
            statesubmission.StateCode[stateCode]
        ) as DraftSubmissionType['stateCode'],
        submissionDescription: submissionDescription,

        contractType: stateSubmissionMessage?.contractInfo?.contractType
            ? (protoEnumToDomain(
                  statesubmission.ContractType[0],
                  statesubmission.ContractType[
                      stateSubmissionMessage.contractInfo.contractType
                  ]
              ) as DraftSubmissionType['contractType'])
            : undefined,

        contractDateStart: stateSubmissionMessage?.contractInfo
            ?.contractDateStart
            ? protoDateToDomain(
                  stateSubmissionMessage.contractInfo.contractDateStart
              )
            : undefined,
        contractDateEnd: stateSubmissionMessage?.contractInfo?.contractDateEnd
            ? protoDateToDomain(
                  stateSubmissionMessage.contractInfo.contractDateEnd
              )
            : undefined,
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

        // TO DO -  MAP THROUGH WHATEVER IS IN RATE INFO
        // rateInfos: [
        //     {
        //         rateType: stateSubmissionMessage.rateType
        //             ? protoEnumToDomain<statesubmission.RateType>(
        //                   statesubmission.RateType[0],
        //                   stateSubmissionMessage.rateType
        //               )
        //             : undefined,
        //         actuaryContacts: stateSubmissionMessage.actuaryContacts
        //             ? stateSubmissionMessage.actuaryContacts.map((contact) => {
        //                   return {
        //                       ...contact,
        //                       actuaryCommunicationType: protoEnumToDomain<
        //                           statesubmission.RateInfo['actuaryCommunicationPreference']
        //                       >(
        //                           statesubmission.ActuaryCommunicationType[0],
        //                           contact.actuarialFirm || ''
        //                       ),
        //                   }
        //               }) || []
        //             : undefined,
        //         actuaryCommunicationPreference:
        //             stateSubmissionMessage.actuaryCommunicationPreference
        //                 ? protoEnumToDomain<statesubmission.ActuaryCommunicationType>(
        //                       statesubmission.ActuaryCommunicationType[0],
        //                       stateSubmissionMessage.actuaryCommunicationPreference
        //                   )
        //                 : undefined,
        //         ...rateAmendmentInfo,
        //     },
        // ],
    }

    if (domainModel.contractType == 'AMENDMENT') {
        if (
            stateSubmissionMessage.contractAmendmentInfo.relatedToCovid_19 ==
                null &&
            stateSubmissionMessage.contractAmendmentInfo.relatedToVaccination ==
                null
        )
            return new Error('Contract amended info')

        domainModel.contractAmendmentInfo = {
            // itemsBeingAmended: statesubmission.contractAmendmentInfo
            //     ?.itemsBeingAmended
            //     ? protoEnumArrayToDomain<statesubmission.AmendedItem>(
            //           'amendableItems',
            //           statesubmission.contractAmendmentInfo?.itemsBeingAmend
            //       )
            //     : undefined,
            // otherItemBeingAmended
            // capitationRatesAmendedInfo: {
            //     ...contractAmendmentInfo?.capitationRatesAmendedInfo,
            //     reason: contractAmendmentInfo?.capitationRatesAmendedInfo
            //         ?.reason
            //         ? protoEnumToDomain<statesubmission.CapitationRateAmendmentReason>(
            //               'capitationRateAmendmentReason',
            //               contractAmendmentInfo?.capitationRatesAmendedInfo
            //                   ?.reason
            //           )
            //         : undefined,
            //         otherReason:
            // },
            relatedToCovid19:
                stateSubmissionMessage.contractAmendmentInfo.relatedToCovid_19,
            relatedToVaccination:
                stateSubmissionMessage.contractAmendmentInfo
                    .relatedToVaccination,
        }
    }

    return domainModel
}

export { toDomain }
