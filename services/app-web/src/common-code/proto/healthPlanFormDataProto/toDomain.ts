import { mcreviewproto } from '../../../gen/healthPlanFormDataProto'
import {
    unlockedHealthPlanFormDataZodSchema,
    lockedHealthPlanFormDataZodSchema,
} from './zodSchemas'
import {
    UnlockedHealthPlanFormDataType,
    LockedHealthPlanFormDataType,
    ActuarialFirmType,
    FederalAuthority,
    ManagedCareEntity,
    isLockedHealthPlanFormData,
    RateInfoType,
    generateRateName,
    HealthPlanFormDataType,
} from '../../healthPlanFormDataType'
import { toLatestProtoVersion } from './toLatestVersion'
import { findStatePrograms } from '../../healthPlanFormDataType/findStatePrograms'

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

export function replaceNullsWithUndefineds<T extends object>(
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
                  v &&
                    typeof v === 'object' &&
                    v.__proto__.constructor === Object
                  ? replaceNullsWithUndefineds(v)
                  : v
    })
    return newObj
}

/*
    Convert proto timestamp to domain Date
*/
const protoTimestampToDomain = (
    protoDateTime: mcreviewproto.IHealthPlanFormData['updatedAt']
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
    protoDate: mcreviewproto.IDate | null | undefined
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
        console.info('LOG: Incomplete Proto Date', protoDate)
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
): mcreviewproto.HealthPlanFormData | Error {
    try {
        const message = mcreviewproto.HealthPlanFormData.decode(buff)
        return message
    } catch (e) {
        return new Error(`${e}`)
    }
}

// This type recursively makes a type Partial, so ever field and every field's field will be optional
type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>
}

// Parsers for each field of UnlockedHealthPlanFormDataType
function parseProtoDocuments(
    docs: mcreviewproto.IDocument[] | null | undefined
): RecursivePartial<UnlockedHealthPlanFormDataType['documents']> {
    if (docs === null || docs === undefined) {
        return []
    }

    return replaceNullsWithUndefineds(docs).map((doc) => ({
        s3URL: doc.s3Url,
        name: doc.name,
        sha256: doc.sha256 || 'sha_undefined_in_proto',
    }))
}

function parseSharedRateCerts(
    certs: mcreviewproto.ISharedRateCertDisplay[] | null | undefined
): RateInfoType['packagesWithSharedRateCerts'] {
    if (certs === null || certs === undefined) {
        return undefined
    }
    return replaceNullsWithUndefineds(certs)
}

function parseContractAmendment(
    amendment: mcreviewproto.IContractInfo['contractAmendmentInfo']
): UnlockedHealthPlanFormDataType['contractAmendmentInfo'] {
    // for now, amendment info and modified provisions are one and the same so we can skip dealing with them being missing separately
    if (!amendment || !amendment.modifiedProvisions) {
        return undefined
    }

    const cleanProvisions = replaceNullsWithUndefineds(
        amendment.modifiedProvisions
    )

    return {
        modifiedProvisions: {
            inLieuServicesAndSettings:
                cleanProvisions.inLieuServicesAndSettings,
            modifiedBenefitsProvided: cleanProvisions.modifiedBenefitsProvided,
            modifiedGeoAreaServed: cleanProvisions.modifiedGeoAreaServed,
            modifiedMedicaidBeneficiaries:
                cleanProvisions.modifiedMedicaidBeneficiaries,
            modifiedRiskSharingStrategy:
                cleanProvisions.modifiedRiskSharingStrategy,
            modifiedIncentiveArrangements:
                cleanProvisions.modifiedIncentiveArrangements,
            modifiedWitholdAgreements:
                cleanProvisions.modifiedWitholdAgreements,
            modifiedStateDirectedPayments:
                cleanProvisions.modifiedStateDirectedPayments,
            modifiedPassThroughPayments:
                cleanProvisions.modifiedPassThroughPayments,
            modifiedPaymentsForMentalDiseaseInstitutions:
                cleanProvisions.modifiedPaymentsForMentalDiseaseInstitutions,
            modifiedMedicalLossRatioStandards:
                cleanProvisions.modifiedMedicalLossRatioStandards,
            modifiedOtherFinancialPaymentIncentive:
                cleanProvisions.modifiedOtherFinancialPaymentIncentive,
            modifiedEnrollmentProcess:
                cleanProvisions.modifiedEnrollmentProcess,
            modifiedGrevienceAndAppeal:
                cleanProvisions.modifiedGrevienceAndAppeal,
            modifiedNetworkAdequacyStandards:
                cleanProvisions.modifiedNetworkAdequacyStandards,
            modifiedLengthOfContract: cleanProvisions.modifiedLengthOfContract,
            modifiedNonRiskPaymentArrangements:
                cleanProvisions.modifiedNonRiskPaymentArrangements,
        },
    }
}

function parseActuaryContacts(
    actuaryContacts: mcreviewproto.IActuaryContact[] | null | undefined
): RecursivePartial<UnlockedHealthPlanFormDataType['addtlActuaryContacts']> {
    if (!actuaryContacts) {
        return []
    }

    const parsedActuaryContacts = replaceNullsWithUndefineds(
        actuaryContacts
    ).map((aContact) => {
        const cleanContact = replaceNullsWithUndefineds(aContact)

        return {
            name: cleanContact?.contact?.name,
            titleRole: cleanContact?.contact?.titleRole,
            email: cleanContact?.contact?.email,
            actuarialFirm: enumToDomain(
                mcreviewproto.ActuarialFirmType,
                aContact.actuarialFirmType
            ) as ActuarialFirmType,
            actuarialFirmOther: cleanContact.actuarialFirmOther,
        }
    })

    return parsedActuaryContacts
}

function parseProtoRateAmendment(
    rateAmendment:
        | mcreviewproto.RateInfo['rateAmendmentInfo']
        | null
        | undefined
): RecursivePartial<RateInfoType['rateAmendmentInfo']> {
    if (!rateAmendment) {
        return undefined
    }

    return {
        effectiveDateEnd: protoDateToDomain(rateAmendment.effectiveDateEnd),
        effectiveDateStart: protoDateToDomain(rateAmendment.effectiveDateStart),
    }
}

function parseRateCertificationName(
    rateCertificationName:
        | mcreviewproto.RateInfo['rateCertificationName']
        | null
        | undefined
): string | undefined {
    if (!rateCertificationName) {
        return undefined
    }
    return rateCertificationName
}

/* if the rateCertificationName is missing, we'll generate it and save it back to the rateInfo */
const updateRateCertificationNames = (
    undifferentiatedFormData:
        | UnlockedHealthPlanFormDataType
        | LockedHealthPlanFormDataType
): UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType => {
    if (
        undifferentiatedFormData.rateInfos &&
        undifferentiatedFormData.rateInfos.length > 0
    ) {
        undifferentiatedFormData.rateInfos.forEach((rateInfo, index) => {
            if (rateInfo && !rateInfo.rateCertificationName) {
                undifferentiatedFormData.rateInfos[
                    index
                ].rateCertificationName = generateRateName(
                    undifferentiatedFormData,
                    rateInfo,
                    findStatePrograms(undifferentiatedFormData.stateCode)
                )
            }
        })
    }
    return undifferentiatedFormData
}

function parseRateInfos(
    rateInfos: mcreviewproto.IRateInfo[]
): RecursivePartial<UnlockedHealthPlanFormDataType['rateInfos']> {
    const rates: RecursivePartial<UnlockedHealthPlanFormDataType['rateInfos']> =
        []

    if (rateInfos.length > 0) {
        rateInfos.forEach((rateInfo) => {
            const rate: RecursivePartial<RateInfoType> = {
                id: rateInfo.id ?? undefined,
                rateAmendmentInfo: parseProtoRateAmendment(
                    rateInfo?.rateAmendmentInfo
                ),
                rateType: enumToDomain(
                    mcreviewproto.RateType,
                    rateInfo?.rateType
                ),
                rateCapitationType: enumToDomain(
                    mcreviewproto.RateCapitationType,
                    rateInfo?.rateCapitationType
                ),
                rateDocuments: parseProtoDocuments(rateInfo?.rateDocuments),
                supportingDocuments: parseProtoDocuments(
                    rateInfo?.supportingDocuments
                ),
                rateDateStart: protoDateToDomain(rateInfo?.rateDateStart),
                rateDateEnd: protoDateToDomain(rateInfo?.rateDateEnd),
                rateDateCertified: protoDateToDomain(
                    rateInfo?.rateDateCertified
                ),
                rateProgramIDs: rateInfo?.rateProgramIds ?? [],
                rateCertificationName: parseRateCertificationName(
                    rateInfo?.rateCertificationName
                ),
                actuaryContacts: parseActuaryContacts(
                    rateInfo?.actuaryContacts
                ),
                actuaryCommunicationPreference: enumToDomain(
                    mcreviewproto.ActuaryCommunicationType,
                    rateInfo?.actuaryCommunicationPreference
                ),
                packagesWithSharedRateCerts:
                    parseSharedRateCerts(
                        rateInfo.packagesWithSharedRateCerts
                    ) ?? [],
            }
            rates.push(rate)
        })
    }

    return rates
}

// End Parsers

type PartialHealthPlanFormData =
    RecursivePartial<UnlockedHealthPlanFormDataType> &
        RecursivePartial<LockedHealthPlanFormDataType>

function parsePartialHPFD(
    status: string | undefined | null,
    maybeUnlockedFormData: PartialHealthPlanFormData
): HealthPlanFormDataType | Error {
    if (status === 'DRAFT') {
        // cast so we can set status
        const maybeDraft =
            maybeUnlockedFormData as RecursivePartial<UnlockedHealthPlanFormDataType>
        maybeDraft.status = 'DRAFT'
        // This parse returns an actual UnlockedHealthPlanFormDataType, so all our partial & casting is put to rest
        const parseResult =
            unlockedHealthPlanFormDataZodSchema.safeParse(maybeDraft)
        if (parseResult.success === false) {
            return parseResult.error
        }
        /* We need a one-off modification here because some older submissions don't have a populated
        rateCertificationName field.  If it's missing, we'll generate it and add it to the form data.
        We do it for locked or unlocked submissions. */
        return updateRateCertificationNames(
            parseResult.data as UnlockedHealthPlanFormDataType
        )
    } else if (status === 'SUBMITTED') {
        const maybeLockedFormData =
            maybeUnlockedFormData as RecursivePartial<LockedHealthPlanFormDataType>
        maybeLockedFormData.status = 'SUBMITTED'

        const parseResult =
            lockedHealthPlanFormDataZodSchema.safeParse(maybeLockedFormData)
        if (parseResult.success === false) {
            console.warn(
                'ERROR: attempting to parse state submission proto failed.'
            )
            return new Error(
                'ERROR: attempting to parse state submission proto failed'
            )
        }
        if (isLockedHealthPlanFormData(maybeLockedFormData)) {
            /* We need a one-off modification here because some older submissions don't have a populated
        rateCertificationName field.  If it's missing, we'll generate it and add it to the form data.
        We do it for locked or unlocked submissions. */
            return updateRateCertificationNames(maybeLockedFormData)
        } else {
            return new Error(
                'ERROR: attempting to parse state submission proto failed'
            )
        }
    }

    // unknown or missing status means we've got a parse error.
    return new Error('Unknown or missing status on this proto. Cannot decode.')
}

const toDomain = (
    buff: Uint8Array
): UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType | Error => {
    const formDataMessageAnyVersion = decodeOrError(buff)
    if (formDataMessageAnyVersion instanceof Error) {
        return formDataMessageAnyVersion
    }

    // toLatestVersion
    const formDataMessage = toLatestProtoVersion(formDataMessageAnyVersion)

    const {
        id,
        status,
        createdAt,
        updatedAt,
        submittedAt,
        stateCode,
        stateNumber,
        populationCovered,
        programIds,
        submissionType,
        riskBasedContract,
        submissionDescription,
        stateContacts,
        contractInfo,
        rateInfos,
        addtlActuaryContacts,
        addtlActuaryCommunicationPreference,
    } = formDataMessage

    const cleanedStateContacts = replaceNullsWithUndefineds(stateContacts)

    // SO, rather than repeat this whole thing for Draft and State submissions, because they are so
    // similar right now, we're just going to & them together for parsing out all the optional stuff
    // from the protobuf for now. If Draft and State submission diverged further in the future this
    // might not be workable anymore and we could break out the parsing into two different branches

    // Since everything in proto-land is optional, we construct a RecursivePartial version of our domain models
    // and
    const maybeUnlockedFormData: PartialHealthPlanFormData = {
        id: id ?? undefined,
        createdAt: protoDateToDomain(createdAt),
        updatedAt: protoTimestampToDomain(updatedAt),
        submittedAt: protoTimestampToDomain(submittedAt),
        populationCovered: enumToDomain(
            mcreviewproto.PopulationCovered,
            populationCovered
        ),
        submissionType: enumToDomain(
            mcreviewproto.SubmissionType,
            submissionType
        ),
        stateCode: enumToDomain(mcreviewproto.StateCode, stateCode),
        submissionDescription: submissionDescription ?? undefined,
        riskBasedContract: riskBasedContract ?? undefined,
        stateNumber: stateNumber ?? undefined,

        programIDs: programIds,

        contractType: enumToDomain(
            mcreviewproto.ContractType,
            formDataMessage?.contractInfo?.contractType
        ),

        contractExecutionStatus: enumToDomain(
            mcreviewproto.ContractExecutionStatus,
            formDataMessage?.contractInfo?.contractExecutionStatus
        ),

        contractDateStart: protoDateToDomain(
            formDataMessage.contractInfo?.contractDateStart
        ),
        contractDateEnd: protoDateToDomain(
            formDataMessage.contractInfo?.contractDateEnd
        ),
        contractDocuments: parseProtoDocuments(
            formDataMessage.contractInfo?.contractDocuments
        ),
        managedCareEntities: protoEnumArrayToDomain(
            mcreviewproto.ManagedCareEntity,
            formDataMessage?.contractInfo?.managedCareEntities
        ) as Partial<ManagedCareEntity[]>,
        federalAuthorities: protoEnumArrayToDomain(
            mcreviewproto.FederalAuthority,
            formDataMessage?.contractInfo?.federalAuthorities
        ) as Partial<FederalAuthority[]>,

        contractAmendmentInfo: parseContractAmendment(
            contractInfo?.contractAmendmentInfo
        ),
        rateInfos: parseRateInfos(rateInfos),
        addtlActuaryCommunicationPreference: enumToDomain(
            mcreviewproto.ActuaryCommunicationType,
            addtlActuaryCommunicationPreference
        ),
        stateContacts: cleanedStateContacts,
        addtlActuaryContacts: parseActuaryContacts(addtlActuaryContacts),
        documents: parseProtoDocuments(formDataMessage.documents),
        statutoryRegulatoryAttestation:
            contractInfo?.statutoryRegulatoryAttestation ?? undefined,
        statutoryRegulatoryAttestationDescription:
            contractInfo?.statutoryRegulatoryAttestationDescription ??
            undefined,
    }

    // Now that we've gotten things into our combined draft & state domain format.
    // we confirm that all the required fields are present to turn this into an UnlockedHealthPlanFormDataType or a LockedHealthPlanFormDataType

    const formDataResult = parsePartialHPFD(status, maybeUnlockedFormData)
    if (formDataResult instanceof Error) {
        console.warn(
            'ERROR: attempting to parse state submission proto failed.',
            id
        )
    }

    return formDataResult
}

export { toDomain, decodeOrError, parsePartialHPFD }
export type { PartialHealthPlanFormData }
