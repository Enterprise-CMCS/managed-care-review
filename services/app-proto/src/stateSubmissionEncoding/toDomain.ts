import { statesubmission } from '../../gen/stateSubmissionProto'
import { draftSubmissionTypeSchema } from '../../gen/draftSubmissionSchema'
import {
    DraftSubmissionType,
    StateSubmissionType,
    ActuarialFirmType,
    ContractAmendmentInfo,
    FederalAuthority,
    isStateSubmission,
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

type StandardEnum<T> = {
    [id: string]: T | string
    [nu: number]: string
}

function betterEnumToDomain<T extends StandardEnum<unknown>, K extends string>(
    protoEnum: T,
    key: number | undefined | null
): K | undefined {
    // proto is returning a default value of 0 for undefined enums
    if (key === undefined || key === null || key == 0) {
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
        const converted = betterEnumToDomain(protoEnum, enumVal)
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
        return e
    }
}

// This type recursively makes a type Partial, so ever field and every field's field will be optional
type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>
}

// Parsers for each sub type of DraftSubmissionType
function parseProtoDocuments(
    docs: statesubmission.IDocument[] | null | undefined
): RecursivePartial<DraftSubmissionType['documents']> {
    if (docs === null || docs === undefined) {
        return []
    }

    return replaceNullsWithUndefineds(docs).map((doc) => ({
        s3URL: doc.s3Url,
        name: doc.name,
    }))
}

//
type CapitationRateI =
    statesubmission.ContractInfo.IContractAmendmentInfo['capitationRatesAmendedInfo']

function parseCapitationRates(
    capRates: CapitationRateI | null | undefined
): ContractAmendmentInfo['capitationRatesAmendedInfo'] | undefined {
    if (!capRates) {
        return undefined
    }

    return {
        reason: betterEnumToDomain(
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
            actuarialFirm: betterEnumToDomain(
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
        id: id,
        createdAt: protoDateToDomain(createdAt),
        updatedAt: protoTimestampToDomain(updatedAt),
        submittedAt: protoTimestampToDomain(submittedAt),
        submissionType: betterEnumToDomain(
            statesubmission.SubmissionType,
            submissionType
        ),
        stateCode: betterEnumToDomain(statesubmission.StateCode, stateCode),
        submissionDescription: submissionDescription,
        stateNumber: stateNumber,

        programID: programIds[0],

        contractType: betterEnumToDomain(
            statesubmission.ContractType,
            stateSubmissionMessage?.contractInfo?.contractType
        ),

        contractDateStart: protoDateToDomain(
            stateSubmissionMessage.contractInfo?.contractDateStart
        ),
        contractDateEnd: protoDateToDomain(
            stateSubmissionMessage.contractInfo?.contractDateEnd
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
        rateType: betterEnumToDomain(
            statesubmission.RateType,
            rateInfo?.rateType
        ),
        rateDateStart: protoDateToDomain(rateInfo?.rateDateStart),
        rateDateEnd: protoDateToDomain(rateInfo?.rateDateEnd),
        rateDateCertified: protoDateToDomain(rateInfo?.rateDateCertified),
        actuaryCommunicationPreference: betterEnumToDomain(
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

        if (parseResult.success == false) {
            return parseResult.error
        }

        return parseResult.data
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
