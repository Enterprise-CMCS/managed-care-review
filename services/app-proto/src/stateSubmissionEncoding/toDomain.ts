import { statesubmission } from '../../gen/stateSubmissionProto'
import { draftSubmissionTypeSchema } from '../../gen/draftSubmissionSchema'
import {
    DraftSubmissionType,
    StateSubmissionType,
    ActuarialFirmType,
    CapitationRatesAmendedReason,
} from '../../../app-web/src/common-code/domain-models'

type RecursivelyReplaceNullWithUndefined<T> = T extends null
    ? undefined
    : T extends Date
    ? T
    : {
          [K in keyof T]: T[K] extends (infer U)[]
              ? RecursivelyReplaceNullWithUndefined<U>[]
              : RecursivelyReplaceNullWithUndefined<T[K]>
      }

/**
 * Recursively replaces all nulls with undefineds.
 * Skips object classes (that have a `.__proto__.constructor`).
 *
 * Unfortunately, until https://github.com/apollographql/apollo-client/issues/2412
 * gets solved at some point,
 * this is the only workaround to prevent `null`s going into the codebase,
 * if it's connected to a Apollo server/client.
 */
export function replaceNullsWithUndefineds<T>(
    obj: T
): RecursivelyReplaceNullWithUndefined<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObj: any = obj instanceof Array ? [] : {}
    Object.keys(obj).forEach((k) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v: any = (obj as any)[k]
        newObj[k as keyof T] =
            v === null
                ? undefined
                : // eslint-disable-next-line no-proto
                v && typeof v === 'object' && v.__proto__.constructor === Object
                ? replaceNullsWithUndefineds(v)
                : v
    })
    return newObj
}

/*
    Convert proto timestamp to domain date
*/
const protoTimestampToDomain = (
    protoDateTime: statesubmission.IStateSubmissionInfo['updatedAt']
): Date | undefined => {
    if (!protoDateTime) {
        return undefined
    }

    if (!protoDateTime.seconds) {
        return undefined
    }

    const miliseconds = protoDateTime?.nanos
        ? protoDateTime?.nanos / 1000000
        : 0

    if (typeof protoDateTime.seconds === 'number') {
        return new Date(protoDateTime?.seconds * 1000 + miliseconds)
    }

    // what's left is "Long"
    const secondsPart = protoDateTime.seconds.mul(1000)

    return new Date(secondsPart.toNumber() + miliseconds)
}

/*
    Convert proto date string to domain data string
*/
const protoDateToDomain = (
    protoDate: statesubmission.IDate | null | undefined
): Date | undefined => {
    if (!protoDate) {
        return undefined
    }

    if (!(protoDate.year && protoDate.month && protoDate.day)) {
        console.log('LOG: Incomplete Proto Date', protoDate)
        return undefined
    }

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

type StandardEnum<T> = {
    [id: string]: T | string
    [nu: number]: string
}

function betterEnumToDomain<T extends StandardEnum<unknown>>(
    protoEnum: T,
    key: number
) {
    const domainEnum = protoEnumToDomain(protoEnum[0], protoEnum[key])
    return domainEnum
}

// protoEnumToDomain(
//             statesubmission.SubmissionType[0],
//             statesubmission.SubmissionType[submissionType]
//         ) as DraftSubmissionType['submissionType']

/*
    Convert array of proto enums to domain enums 
*/
// function protoEnumArrayToDomain<T extends StandardEnum<unknown>>(
//     protoEnum: T,
//     protoEnumArray: number[]
// ): string[] {
//     return protoEnumArray.map((enumVal) =>
//         betterEnumToDomain(protoEnum, enumVal)
//     )
// }

/* 
Remove the proto enum prefix using the default value of that field
    - (e.g. return SUBMISSION_TYPE from the default value SUBMISSION_TYPE_UNSPECIFIED)
*/
function removeEnumPrefix(defaultValue: string, protoEnum: string): string {
    const lastUnderscoreIndex = defaultValue.lastIndexOf('_')
    const prefix = defaultValue.substring(0, lastUnderscoreIndex + 1)
    return protoEnum.replace(prefix, '')
}

function decodeOrError(
    buff: Uint8Array
): statesubmission.StateSubmissionInfo | Error {
    try {
        const message = statesubmission.StateSubmissionInfo.decode(buff)
        return message
    } catch (e) {
        return e
    }
}

type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>
}

// TO CONSIDER: determine what type we have - draft submission or state submission and construct accordingly
const toDomain = (buff: Uint8Array): DraftSubmissionType | Error => {
    const stateSubmissionMessage = decodeOrError(buff)

    if (stateSubmissionMessage instanceof Error) {
        return stateSubmissionMessage
    }

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

    const cleanedStateContacts = replaceNullsWithUndefineds(stateContacts)

    const cleanContractInfo = replaceNullsWithUndefineds(contractInfo)

    // Protos support multiple rate infos for now, but we only support one in our domain models
    // so if there are multiple we'll drop the extras.
    let rateInfo: statesubmission.IRateInfo | undefined = undefined
    let actuaryContacts: RecursivePartial<
        DraftSubmissionType['actuaryContacts']
    > = []
    if (rateInfos.length > 0) {
        rateInfo = rateInfos[0]

        console.log('RATINGE', JSON.stringify(rateInfo))

        // pull out the actuary contacts
        if (rateInfo.actuaryContacts) {
            actuaryContacts = rateInfo.actuaryContacts.map((aContact) => {
                const firm = aContact.actuarialFirmType
                    ? (betterEnumToDomain(
                          statesubmission.ActuarialFirmType,
                          aContact.actuarialFirmType
                      ) as ActuarialFirmType)
                    : undefined

                const cleanContact = replaceNullsWithUndefineds(aContact)

                return {
                    name: cleanContact?.contact?.name,
                    titleRole: cleanContact?.contact?.titleRole,
                    email: cleanContact?.contact?.email,
                    actuarialFirm: firm,
                    actuarialFirmOther: cleanContact.actuarialFirmOther,
                }
            })
        }
    }

    console.log('writing', actuaryContacts)

    // some kind of recursive parser would be really nice here. io-ts might be the easy answer for that

    // as is, we have to do our validations here.
    // some kind of wrapper, that returns whatever type you put in it Or and error type with a list of errors?

    // the type you put in takes types that take the same

    const errors: Error[] = []
    let hasErrs = false

    const maybeCreatedAt = protoDateToDomain(createdAt)

    const maybeContractDateStart = protoDateToDomain(
        stateSubmissionMessage.contractInfo?.contractDateStart
    )

    // contacts we have to map in.
    // For now, if a contact is incomplete, we delete it.
    // const domainStateContacts: DraftSubmissionType['stateContacts'] = []

    // So the idea here is that we construct a Partial DraftSubmissionType by converting the
    // pesky proto types over. Enums and Dates, so far.
    // then we can assert that everything we require to be present is present all at once.

    // It doesn't seem ideal yet, but it's something.
    // crucially, I'm not sure we'll see errors here when we add a new field.
    // the runtime typecheck is mostly just checking that things aren't undefined.

    // it would be nice to type this stronger...
    // could at least say it has keys of domain model?
    // we really want a recursive partial.
    const maybeDomainModel: RecursivePartial<DraftSubmissionType> = {
        id: id,
        status: 'DRAFT',
        createdAt: maybeCreatedAt,
        updatedAt: protoTimestampToDomain(updatedAt),
        submissionType: betterEnumToDomain(
            statesubmission.SubmissionType,
            submissionType
        ) as DraftSubmissionType['submissionType'],
        stateCode: betterEnumToDomain(statesubmission.StateCode, stateCode),
        submissionDescription: submissionDescription,
        stateNumber: stateNumber,

        programID: programIds[0],

        contractType: stateSubmissionMessage?.contractInfo?.contractType
            ? (betterEnumToDomain(
                  statesubmission.ContractType,
                  stateSubmissionMessage.contractInfo.contractType
              ) as DraftSubmissionType['contractType'])
            : undefined,

        contractDateStart: stateSubmissionMessage.contractInfo
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
            ? stateSubmissionMessage?.contractInfo?.managedCareEntities.map(
                  (entity) =>
                      betterEnumToDomain(
                          statesubmission.ManagedCareEntity,
                          entity
                      ) as DraftSubmissionType['managedCareEntities'][number]
              )
            : [],
        federalAuthorities: stateSubmissionMessage?.contractInfo
            ?.federalAuthorities
            ? stateSubmissionMessage?.contractInfo?.federalAuthorities.map(
                  (protoEnum) =>
                      betterEnumToDomain(
                          statesubmission.FederalAuthority,
                          protoEnum
                      ) as DraftSubmissionType['federalAuthorities'][number]
              )
            : [],

        contractAmendmentInfo: cleanContractInfo?.contractAmendmentInfo
            ? {
                  // items being amended are an enum in proto but not in domain
                  itemsBeingAmended:
                      cleanContractInfo.contractAmendmentInfo.amendableItems?.map(
                          (item) =>
                              betterEnumToDomain(
                                  statesubmission.AmendedItem,
                                  item
                              )
                      ) ?? [],

                  capitationRatesAmendedInfo: cleanContractInfo
                      .contractAmendmentInfo.capitationRatesAmendedInfo
                      ? {
                            reason: cleanContractInfo.contractAmendmentInfo
                                .capitationRatesAmendedInfo.reason
                                ? (betterEnumToDomain(
                                      statesubmission.CapitationRateAmendmentReason,
                                      cleanContractInfo.contractAmendmentInfo
                                          .capitationRatesAmendedInfo.reason
                                  ) as CapitationRatesAmendedReason)
                                : undefined,
                            otherReason:
                                cleanContractInfo.contractAmendmentInfo
                                    .capitationRatesAmendedInfo.otherReason,
                        }
                      : undefined,
                  otherItemBeingAmended:
                      cleanContractInfo.contractAmendmentInfo
                          .otherAmendableItem,
                  relatedToCovid19:
                      cleanContractInfo.contractAmendmentInfo.relatedToCovid_19,
                  relatedToVaccination:
                      cleanContractInfo.contractAmendmentInfo
                          .relatedToVaccination,
              }
            : undefined,

        rateAmendmentInfo: rateInfo?.rateAmendmentInfo
            ? {
                  effectiveDateEnd: protoDateToDomain(
                      rateInfo.rateAmendmentInfo.effectiveDateEnd
                  ),
                  effectiveDateStart: protoDateToDomain(
                      rateInfo.rateAmendmentInfo.effectiveDateStart
                  ),
              }
            : undefined,
        rateType: rateInfo?.rateType
            ? (betterEnumToDomain(
                  statesubmission.RateType,
                  rateInfo.rateType
              ) as DraftSubmissionType['rateType'])
            : undefined,
        rateDateStart: protoDateToDomain(rateInfo?.rateDateStart),
        rateDateEnd: protoDateToDomain(rateInfo?.rateDateEnd),
        rateDateCertified: protoDateToDomain(rateInfo?.rateDateCertified),
        actuaryCommunicationPreference: rateInfo?.actuaryCommunicationPreference
            ? (betterEnumToDomain(
                  statesubmission.ActuaryCommunicationType,
                  rateInfo.actuaryCommunicationPreference
              ) as DraftSubmissionType['actuaryCommunicationPreference'])
            : undefined,
        stateContacts: cleanedStateContacts,
        actuaryContacts: actuaryContacts,
        documents: replaceNullsWithUndefineds(
            stateSubmissionMessage.documents
        ).map((doc) => ({
            s3URL: doc.s3Url,
            name: doc.name,
        })),
    }

    const parseResult = draftSubmissionTypeSchema.safeParse(maybeDomainModel)

    if (parseResult.success == false) {
        return parseResult.error
    }

    return parseResult.data
}

export { toDomain }
