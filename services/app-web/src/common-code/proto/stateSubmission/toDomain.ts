import { statesubmission } from '../../../gen/stateSubmissionProto'
import { draftSubmissionTypeSchema } from './draftSubmissionSchema'
import {
    DraftSubmissionType,
    StateSubmissionType,
    DocumentCategoryType,
    ActuarialFirmType,
    ContractAmendmentInfo,
    FederalAuthority,
    isStateSubmission,
} from '../../domain-models'

/**
 * Recursively replaces all nulls with undefineds.
 * Because the generated proto code allows null | undefined for everything, we simplify our lives
 * by converting all the nulls to undefineds. The type below makes the type checker happy.
 * Adapted from https://github.com/apollographql/apollo-client/issues/2412
 */
type RecursivelyReplaceNullWithUndefined<T> = T extends null
    ? undefined
    : T extends Date
    ? T
    : {
          [K in keyof T]: T[K] extends (infer U)[]
              ? RecursivelyReplaceNullWithUndefined<U>[]
              : RecursivelyReplaceNullWithUndefined<T[K]>
      }

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
    Convert proto timestamp to domain Date
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
    Convert proto CalendarDate (year/month/day) to domain Date
*/
const protoDateToDomain = (
    protoDate: statesubmission.IDate | null | undefined
): Date | undefined => {
    if (!protoDate) {
        return undefined
    }

    // intentionally using `== null` here to check for null and undefined but _not_ 0
    if (
        protoDate.year == null ||
        protoDate.month == null ||
        protoDate.day == null
    ) {
        console.log('LOG: Incomplete Proto Date', protoDate)
        return undefined
    }

    return new Date(Date.UTC(protoDate.year, protoDate.month, protoDate.day))
}
/*
    Convert proto enum (e.g. SUBMISSION_TYPE_CONTRACT_ONLY) to domain enum (e.g. CONTRACT_ONLY)
*/

type StandardEnum<T> = {
    [id: string]: T | string
    [nu: number]: string
}

function enumToDomain<T extends StandardEnum<unknown>, K extends string>(
    protoEnum: T,
    key: number | undefined | null
): K | undefined {
    // proto is returning a default value of 0 for undefined enums
    if (key === undefined || key === null || key === 0) {
        return undefined
    }
    const domainEnum = removeEnumPrefix(protoEnum[0], protoEnum[key])

    return domainEnum as K
}

/*
    Convert array of proto enums to domain enums
    I couldn't figure out a signature to make it do the casting itself so
    we still need to cast this result for enums.
*/
function protoEnumArrayToDomain<T extends StandardEnum<unknown>>(
    protoEnum: T,
    protoEnumArray: number[] | undefined | null
): string[] {
    if (!protoEnumArray) {
        return []
    }

    // since the enum array itself can have null values we compress here
    const enums = []
    for (const enumVal of protoEnumArray) {
        const converted = enumToDomain(protoEnum, enumVal)
        if (converted) {
            enums.push(converted)
        }
    }

    return enums
}

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
        return new Error(`${e}`)
    }
}

// This type recursively makes a type Partial, so ever field and every field's field will be optional
type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>
}

// Parsers for each field of DraftSubmissionType
function parseProtoDocuments(
    docs: statesubmission.IDocument[] | null | undefined
): RecursivePartial<DraftSubmissionType['documents']> {
    if (docs === null || docs === undefined) {
        return []
    }

    return replaceNullsWithUndefineds(docs).map((doc) => ({
        s3URL: doc.s3Url,
        name: doc.name,
        documentCategories: protoEnumArrayToDomain(
            statesubmission.DocumentCategory,
            doc.documentCategories
        ) as DocumentCategoryType[],
    }))
}

// Just pulling this type out of the hierarchy
type CapitationRateI =
    statesubmission.ContractInfo.IContractAmendmentInfo['capitationRatesAmendedInfo']

function parseCapitationRates(
    capRates: CapitationRateI | null | undefined
): ContractAmendmentInfo['capitationRatesAmendedInfo'] | undefined {
    if (!capRates) {
        return undefined
    }

    return {
        reason: enumToDomain(
            statesubmission.CapitationRateAmendmentReason,
            capRates.reason
        ),
        otherReason: capRates.otherReason ?? undefined,
    }
}

function parseContractAmendment(
    amendment: statesubmission.IContractInfo['contractAmendmentInfo']
): RecursivePartial<DraftSubmissionType['contractAmendmentInfo']> {
    if (!amendment) {
        return undefined
    }

    const cleanAmendment = replaceNullsWithUndefineds(amendment)

    return {
        // items being amended are an enum in proto but not in domain
        itemsBeingAmended: protoEnumArrayToDomain(
            statesubmission.AmendedItem,
            amendment.amendableItems
        ),

        capitationRatesAmendedInfo: parseCapitationRates(
            cleanAmendment.capitationRatesAmendedInfo
        ),
        otherItemBeingAmended: cleanAmendment.otherAmendableItem,
        relatedToCovid19: cleanAmendment.relatedToCovid_19,
        relatedToVaccination: cleanAmendment.relatedToVaccination,
    }
}

function parseActuaryContacts(
    rateInfo: statesubmission.IRateInfo | null | undefined
): RecursivePartial<DraftSubmissionType['actuaryContacts']> {
    if (!rateInfo?.actuaryContacts) {
        return []
    }

    const actuaryContacts = replaceNullsWithUndefineds(
        rateInfo.actuaryContacts
    ).map((aContact) => {
        const cleanContact = replaceNullsWithUndefineds(aContact)

        return {
            name: cleanContact?.contact?.name,
            titleRole: cleanContact?.contact?.titleRole,
            email: cleanContact?.contact?.email,
            actuarialFirm: enumToDomain(
                statesubmission.ActuarialFirmType,
                aContact.actuarialFirmType
            ) as ActuarialFirmType,
            actuarialFirmOther: cleanContact.actuarialFirmOther,
        }
    })

    return actuaryContacts
}

function parseProtoRateAmendment(
    rateAmendment:
        | statesubmission.RateInfo['rateAmendmentInfo']
        | null
        | undefined
): RecursivePartial<DraftSubmissionType['rateAmendmentInfo']> {
    if (!rateAmendment) {
        return undefined
    }

    return {
        effectiveDateEnd: protoDateToDomain(rateAmendment.effectiveDateEnd),
        effectiveDateStart: protoDateToDomain(rateAmendment.effectiveDateStart),
    }
}

// End Parsers

const toDomain = (
    buff: Uint8Array
): DraftSubmissionType | StateSubmissionType | Error => {
    const stateSubmissionMessage = decodeOrError(buff)

    if (stateSubmissionMessage instanceof Error) {
        return stateSubmissionMessage
    }

    const {
        protoName,
        protoVersion,
        id,
        status,
        createdAt,
        updatedAt,
        submittedAt,
        stateCode,
        stateNumber,
        programIds,
        submissionType,
        submissionDescription,
        stateContacts,
        contractInfo,
        rateInfos,
    } = stateSubmissionMessage

    // First things first, let's check the protoName and protoVersion
    if (protoName !== 'STATE_SUBMISSION' && protoVersion !== 1) {
        console.log(
            `WARNING: We are unboxing a proto our code doesn't recognize:`,
            protoName,
            protoVersion
        )
    }

    const cleanedStateContacts = replaceNullsWithUndefineds(stateContacts)

    // Protos support multiple rate infos for now, but we only support one in our domain models
    // so if there are multiple we'll drop the extras.
    let rateInfo: statesubmission.IRateInfo | undefined = undefined
    if (rateInfos.length > 0) {
        rateInfo = rateInfos[0]
    }

    // SO, rather than repeat this whole thing for Draft and State submissions, because they are so
    // similar right now, we're just going to & them together for parsing out all the optional stuff
    // from the protobuf for now. If Draft and State submission diverged further in the future this
    // might not be workable anymore and we could break out the parsing into two different branches

    // Since everything in proto-land is optional, we construct a RecursivePartial version of our domain models
    // and
    const maybeDomainModel: RecursivePartial<DraftSubmissionType> &
        RecursivePartial<StateSubmissionType> = {
        id: id ?? undefined,
        createdAt: protoDateToDomain(createdAt),
        updatedAt: protoTimestampToDomain(updatedAt),
        submittedAt: protoTimestampToDomain(submittedAt),
        submissionType: enumToDomain(
            statesubmission.SubmissionType,
            submissionType
        ),
        stateCode: enumToDomain(statesubmission.StateCode, stateCode),
        submissionDescription: submissionDescription ?? undefined,
        stateNumber: stateNumber ?? undefined,

        programIDs: programIds,

        contractType: enumToDomain(
            statesubmission.ContractType,
            stateSubmissionMessage?.contractInfo?.contractType
        ),

        contractDateStart: protoDateToDomain(
            stateSubmissionMessage.contractInfo?.contractDateStart
        ),
        contractDateEnd: protoDateToDomain(
            stateSubmissionMessage.contractInfo?.contractDateEnd
        ),
        contractDocuments: parseProtoDocuments(
            stateSubmissionMessage.contractInfo?.contractDocuments
        ),
        managedCareEntities: protoEnumArrayToDomain(
            statesubmission.ManagedCareEntity,
            stateSubmissionMessage?.contractInfo?.managedCareEntities
        ),
        federalAuthorities: protoEnumArrayToDomain(
            statesubmission.FederalAuthority,
            stateSubmissionMessage?.contractInfo?.federalAuthorities
        ) as Partial<FederalAuthority[]>,

        contractAmendmentInfo: parseContractAmendment(
            contractInfo?.contractAmendmentInfo
        ),
        rateAmendmentInfo: parseProtoRateAmendment(rateInfo?.rateAmendmentInfo),
        rateType: enumToDomain(statesubmission.RateType, rateInfo?.rateType),
        rateDocuments: parseProtoDocuments(rateInfo?.rateDocuments),
        rateDateStart: protoDateToDomain(rateInfo?.rateDateStart),
        rateDateEnd: protoDateToDomain(rateInfo?.rateDateEnd),
        rateDateCertified: protoDateToDomain(rateInfo?.rateDateCertified),
        actuaryCommunicationPreference: enumToDomain(
            statesubmission.ActuaryCommunicationType,
            rateInfo?.actuaryCommunicationPreference
        ),
        stateContacts: cleanedStateContacts,
        actuaryContacts: parseActuaryContacts(rateInfo),
        documents: parseProtoDocuments(stateSubmissionMessage.documents),
    }

    // Now that we've gotten things into our combined draft & state domain format.
    // we confirm that all the required fields are present to turn this into a DraftSubmissionType or a StateSubmissionType
    if (status === 'DRAFT') {
        // cast so we can set status
        const maybeDraft =
            maybeDomainModel as RecursivePartial<DraftSubmissionType>
        maybeDraft.status = 'DRAFT'

        // This parse returns an actual DraftSubmissionType, so all our partial & casting is put to rest
        const parseResult = draftSubmissionTypeSchema.safeParse(maybeDraft)

        if (parseResult.success === false) {
            return parseResult.error
        }

        return parseResult.data as DraftSubmissionType
    } else if (status === 'SUBMITTED') {
        const maybeStateSubmission =
            maybeDomainModel as RecursivePartial<StateSubmissionType>
        maybeStateSubmission.status = 'SUBMITTED'

        if (isStateSubmission(maybeStateSubmission)) {
            return maybeStateSubmission
        } else {
            console.log(
                'ERROR: attempting to parse state submission proto failed.',
                id
            )
            return new Error(
                'ERROR: attempting to parse state submission proto failed'
            )
        }
    }

    // unknown or missing status means we've got a parse error.
    console.log('ERROR: Unknown or missing status on this proto.', id, status)
    return new Error('Unknown or missing status on this proto. Cannot decode.')
}

export { toDomain }
