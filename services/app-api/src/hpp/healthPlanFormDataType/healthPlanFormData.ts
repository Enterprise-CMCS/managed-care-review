import type {
    RateInfoType,
    UnlockedHealthPlanFormDataType,
    ActuaryContact,
} from './UnlockedHealthPlanFormDataType'
import {
    provisionCHIPKeys,
    modifiedProvisionMedicaidAmendmentKeys,
    modifiedProvisionMedicaidBaseKeys,
} from './ModifiedProvisions'
import { formatRateNameDate } from '@mc-review/dates'
import type { LockedHealthPlanFormDataType } from './LockedHealthPlanFormDataType'
import type { HealthPlanFormDataType } from './HealthPlanFormDataType'
import type { ProgramArgType } from './index'

// TODO: Refactor into multiple files and add unit tests to these functions

const isContractOnly = (sub: HealthPlanFormDataType): boolean =>
    sub.submissionType === 'CONTRACT_ONLY'

const isBaseContract = (sub: HealthPlanFormDataType): boolean =>
    sub.contractType === 'BASE'

const isContractAmendment = (sub: HealthPlanFormDataType): boolean =>
    sub.contractType === 'AMENDMENT'

const isRateAmendment = (rateInfo: RateInfoType): boolean =>
    rateInfo.rateType === 'AMENDMENT'

const isCHIPOnly = (sub: HealthPlanFormDataType): boolean =>
    sub.populationCovered === 'CHIP'

const isContractAndRates = (sub: HealthPlanFormDataType): boolean =>
    sub.submissionType === 'CONTRACT_AND_RATES'

const isContractWithProvisions = (sub: HealthPlanFormDataType): boolean =>
    isContractAmendment(sub) || (isBaseContract(sub) && !isCHIPOnly(sub))

const isSubmitted = (sub: HealthPlanFormDataType): boolean =>
    sub.status === 'SUBMITTED'

const hasValidModifiedProvisions = (
    sub: LockedHealthPlanFormDataType
): boolean => {
    const provisions = sub.contractAmendmentInfo?.modifiedProvisions

    if (!isContractWithProvisions(sub)) return true // if the contract doesn't require any provision yes/nos, it is already valid
    if (provisions === undefined) return false

    return isCHIPOnly(sub)
        ? provisionCHIPKeys.every(
              (provision) => provisions[provision] !== undefined
          )
        : isBaseContract(sub)
          ? modifiedProvisionMedicaidBaseKeys.every(
                (provision) => provisions[provision] !== undefined
            )
          : modifiedProvisionMedicaidAmendmentKeys.every(
                (provision) => provisions[provision] !== undefined
            )
}
const hasValidContract = (sub: LockedHealthPlanFormDataType): boolean =>
    sub.contractType !== undefined &&
    sub.contractExecutionStatus !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.managedCareEntities.length !== 0 &&
    sub.federalAuthorities.length !== 0 &&
    sub.riskBasedContract !== undefined &&
    hasValidModifiedProvisions(sub) &&
    hasValidPopulationCoverage(sub)

const hasValidPopulationCoverage = (
    sub: LockedHealthPlanFormDataType
): boolean => sub.populationCovered !== undefined

const hasValidActuaries = (actuaries: ActuaryContact[]): boolean =>
    actuaries &&
    actuaries.length > 0 &&
    actuaries.every(
        (actuaryContact) =>
            actuaryContact.name !== undefined &&
            actuaryContact.titleRole !== undefined &&
            actuaryContact.email !== undefined &&
            ((actuaryContact.actuarialFirm !== undefined &&
                actuaryContact.actuarialFirm !== 'OTHER') ||
                (actuaryContact.actuarialFirm === 'OTHER' &&
                    actuaryContact.actuarialFirmOther !== undefined))
    )

const hasValidRates = (sub: LockedHealthPlanFormDataType): boolean => {
    const validRates = sub.rateInfos.every((rateInfo) => {
        const validBaseRate =
            rateInfo.rateType !== undefined &&
            rateInfo.rateDateCertified !== undefined &&
            rateInfo.rateDateStart !== undefined &&
            rateInfo.rateDateEnd !== undefined &&
            rateInfo.rateProgramIDs !== undefined &&
            rateInfo.rateProgramIDs.length > 0 &&
            hasValidActuaries(rateInfo.actuaryContacts)

        if (isRateAmendment(rateInfo)) {
            return (
                validBaseRate &&
                Boolean(
                    rateInfo.rateAmendmentInfo &&
                        rateInfo.rateAmendmentInfo.effectiveDateEnd &&
                        rateInfo.rateAmendmentInfo.effectiveDateStart
                )
            )
        }

        return validBaseRate
    })

    // Contract only - skip all validations for hasValidRates
    if (sub.submissionType === 'CONTRACT_ONLY') {
        return true
    } else {
        return validRates
    }
}

//Returns boolean if package has any valid rate data
const hasAnyValidRateData = (
    sub: LockedHealthPlanFormDataType | UnlockedHealthPlanFormDataType
): boolean => {
    return (
        //Any rate inside array of rateInfo would mean there is rate data.
        sub.rateInfos.length > 0
    )
}

const hasValidDocuments = (sub: LockedHealthPlanFormDataType): boolean => {
    const validRateDocuments =
        sub.submissionType === 'CONTRACT_AND_RATES'
            ? sub.rateInfos.every((rateInfo) =>
                  Boolean(rateInfo.rateDocuments.length)
              )
            : true

    const validContractDocuments = sub.contractDocuments.length !== 0
    return validRateDocuments && validContractDocuments
}

const isLockedHealthPlanFormData = (
    sub: unknown
): sub is LockedHealthPlanFormDataType => {
    if (sub && typeof sub === 'object' && 'status' in sub) {
        const maybeStateSub = sub as LockedHealthPlanFormDataType
        return (
            maybeStateSub.status === 'SUBMITTED' &&
            'submittedAt' in maybeStateSub
        )
    }
    return false
}

const naturalSort = (a: string, b: string): number => {
    return a.localeCompare(b, 'en', { numeric: true })
}

// Since these functions are in common code, we don't want to rely on the api or gql program types
// instead we create an interface with what is required for these functions, since both those types
// implement it, we can use it interchangeably
// Pull out the programs names for display from the program IDs
function programNames(
    programs: ProgramArgType[],
    programIDs: string[]
): string[] {
    return programIDs.map((id) => {
        const program = programs.find((p) => p.id === id)
        if (!program) {
            return 'Unknown Program'
        }
        return program.name
    })
}

function packageName(
    stateCode: string,
    stateNumber: number,
    programIDs: string[],
    statePrograms: ProgramArgType[]
): string {
    const padNumber = stateNumber.toString().padStart(4, '0')
    const pNames = programNames(statePrograms, programIDs)
    const formattedProgramNames = pNames
        .sort(naturalSort)
        .map((n) =>
            n
                .replace(/\s/g, '-')
                .replace(/[^a-zA-Z0-9+]/g, '')
                .toUpperCase()
        )
        .join('-')
    return `MCR-${stateCode.toUpperCase()}-${padNumber}-${formattedProgramNames}`
}

const generateRateName = (
    pkg: HealthPlanFormDataType,
    rateInfo: RateInfoType,
    statePrograms: ProgramArgType[]
): string => {
    const {
        rateType,
        rateAmendmentInfo,
        rateDateCertified,
        rateDateEnd,
        rateDateStart,
    } = rateInfo

    // Default to package programs if rate programs do not exist
    const rateProgramIDs = rateInfo.rateProgramIDs?.length
        ? rateInfo.rateProgramIDs
        : pkg.programIDs

    let rateName = `${packageName(
        pkg.stateCode,
        pkg.stateNumber,
        rateProgramIDs,
        statePrograms
    )}-RATE`

    if (rateType === 'AMENDMENT' && rateAmendmentInfo?.effectiveDateStart) {
        rateName = rateName.concat(
            '-',
            formatRateNameDate(rateAmendmentInfo.effectiveDateStart)
        )
    } else if ((rateType === 'NEW' || !rateType) && rateDateStart) {
        rateName = rateName.concat('-', formatRateNameDate(rateDateStart))
    }

    if (rateType === 'AMENDMENT' && rateAmendmentInfo?.effectiveDateEnd) {
        rateName = rateName.concat(
            '-',
            formatRateNameDate(rateAmendmentInfo.effectiveDateEnd)
        )
    } else if ((rateType === 'NEW' || !rateType) && rateDateEnd) {
        rateName = rateName.concat('-', formatRateNameDate(rateDateEnd))
    }

    if (rateType === 'AMENDMENT') {
        rateName = rateName.concat('-', 'AMENDMENT')
    } else if (rateType === 'NEW') {
        rateName = rateName.concat('-', 'CERTIFICATION')
    }

    if (rateDateCertified) {
        rateName = rateName.concat('-', formatRateNameDate(rateDateCertified))
    }
    return rateName
}

const removeRatesData = (
    pkg: HealthPlanFormDataType
): HealthPlanFormDataType => {
    pkg.rateInfos = []
    pkg.addtlActuaryContacts = []
    pkg.addtlActuaryCommunicationPreference = undefined

    return pkg
}

export {
    isContractWithProvisions,
    hasValidModifiedProvisions,
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    hasAnyValidRateData,
    isBaseContract,
    isContractAmendment,
    isCHIPOnly,
    isContractOnly,
    isContractAndRates,
    isLockedHealthPlanFormData,
    isSubmitted,
    programNames,
    packageName,
    generateRateName,
    removeRatesData,
    hasValidPopulationCoverage,
}
