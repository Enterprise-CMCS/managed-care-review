import {
    SubmissionDocument,
    UnlockedHealthPlanFormDataType,
} from './UnlockedHealthPlanFormDataType'
import { ModifiedProvisions } from './ModifiedProvisions'
import { LockedHealthPlanFormDataType } from './LockedHealthPlanFormDataType'
import { HealthPlanFormDataType } from './HealthPlanFormDataType'
import { formatRateNameDate } from '../../common-code/dateHelpers'
import { ProgramArgType } from '.'

const isContractOnly = (
    sub: UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType
): boolean => sub.submissionType === 'CONTRACT_ONLY'

const isContractAndRates = (
    sub: UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType
): boolean => sub.submissionType === 'CONTRACT_AND_RATES'

const isRateAmendment = (
    sub: UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType
): boolean => sub.rateType === 'AMENDMENT'

const hasValidModifiedProvisions = (
    provisions: ModifiedProvisions | undefined
): boolean =>
    provisions !== undefined &&
    provisions.modifiedBenefitsProvided !== undefined &&
    provisions.modifiedGeoAreaServed !== undefined &&
    provisions.modifiedMedicaidBeneficiaries !== undefined &&
    provisions.modifiedRiskSharingStrategy !== undefined &&
    provisions.modifiedIncentiveArrangements !== undefined &&
    provisions.modifiedWitholdAgreements !== undefined &&
    provisions.modifiedStateDirectedPayments !== undefined &&
    provisions.modifiedPassThroughPayments !== undefined &&
    provisions.modifiedPaymentsForMentalDiseaseInstitutions !== undefined &&
    provisions.modifiedMedicalLossRatioStandards !== undefined &&
    provisions.modifiedOtherFinancialPaymentIncentive !== undefined &&
    provisions.modifiedEnrollmentProcess !== undefined &&
    provisions.modifiedGrevienceAndAppeal !== undefined &&
    provisions.modifiedNetworkAdequacyStandards !== undefined &&
    provisions.modifiedLengthOfContract !== undefined &&
    provisions.modifiedNonRiskPaymentArrangements !== undefined

const hasValidContract = (sub: LockedHealthPlanFormDataType): boolean =>
    sub.contractType !== undefined &&
    sub.contractExecutionStatus !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.managedCareEntities.length !== 0 &&
    sub.federalAuthorities.length !== 0 &&
    (sub.contractType === 'BASE' || // If it's an amendment, then all the yes/nos must be set.
        hasValidModifiedProvisions(
            sub.contractAmendmentInfo?.modifiedProvisions
        ))

const hasValidRates = (sub: LockedHealthPlanFormDataType): boolean => {
    const validBaseRate =
        sub.rateType !== undefined &&
        sub.rateDateCertified !== undefined &&
        sub.rateDateStart !== undefined &&
        sub.rateDateEnd !== undefined &&
        (sub.rateProgramIDs !== undefined || sub.rateProgramIDs !== [])

    // Contract only should have no rate fields
    if (sub.submissionType === 'CONTRACT_ONLY') {
        return !validBaseRate ? true : false
    } else {
        return isRateAmendment(sub)
            ? validBaseRate &&
                  Boolean(
                      sub.rateAmendmentInfo &&
                          sub.rateAmendmentInfo.effectiveDateEnd &&
                          sub.rateAmendmentInfo.effectiveDateStart
                  )
            : validBaseRate
    }
}

//Returns boolean if package has any valid rate data
const hasAnyValidRateData = (
    sub: LockedHealthPlanFormDataType | UnlockedHealthPlanFormDataType
): boolean => {
    return (
        sub.rateType !== undefined ||
        sub.rateDateCertified !== undefined ||
        sub.rateDateStart !== undefined ||
        sub.rateDateEnd !== undefined ||
        sub.rateCapitationType !== undefined ||
        sub.rateAmendmentInfo !== undefined ||
        sub.actuaryContacts !== undefined ||
        (Array.isArray(sub.rateProgramIDs) && !!sub.rateProgramIDs.length) ||
        sub.documents.some((document) =>
            document.documentCategories.includes('CONTRACT_RELATED')
        ) ||
        (Array.isArray(sub.rateDocuments) && !!sub.rateDocuments.length)
    )
}

const hasValidDocuments = (sub: LockedHealthPlanFormDataType): boolean => {
    const validRateDocuments =
        sub.submissionType === 'CONTRACT_AND_RATES'
            ? sub.rateDocuments?.length !== 0
            : true

    const validContractDocuments = sub.contractDocuments.length !== 0
    return validRateDocuments && validContractDocuments
}

const hasValidSupportingDocumentCategories = (
    sub: LockedHealthPlanFormDataType
): boolean => {
    // every document must have a category
    if (!sub.documents.every((doc) => doc.documentCategories.length > 0)) {
        return false
    }
    // if the submission is contract-only, all supporting docs must be 'CONTRACT-RELATED
    if (
        sub.submissionType === 'CONTRACT_ONLY' &&
        sub.documents.length > 0 &&
        !sub.documents.every((doc) =>
            doc.documentCategories.includes('CONTRACT_RELATED')
        )
    ) {
        return false
    }
    return true
}

const isLockedHealthPlanFormData = (
    sub: unknown
): sub is LockedHealthPlanFormDataType => {
    if (sub && typeof sub === 'object' && 'status' in sub) {
        const maybeStateSub = sub as LockedHealthPlanFormDataType
        return (
            maybeStateSub.status === 'SUBMITTED' &&
            hasValidContract(maybeStateSub) &&
            hasValidRates(maybeStateSub) &&
            hasValidDocuments(maybeStateSub)
        )
    }
    return false
}

const isUnlockedHealthPlanFormData = (
    sub: unknown
): sub is UnlockedHealthPlanFormDataType => {
    if (sub && typeof sub === 'object') {
        if ('status' in sub) {
            const maybeDraft = sub as { status: unknown }

            return (
                maybeDraft.status === 'DRAFT' && !('submittedAt' in maybeDraft)
            )
        }
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
    pkg: HealthPlanFormDataType,
    statePrograms: ProgramArgType[],
    programIDs?: string[]
): string {
    const padNumber = pkg.stateNumber.toString().padStart(4, '0')
    const pNames =
        // This ternary is needed because programIDs passed in could be undefined or an empty string, in that case
        // we want to default to using programIDs from submission
        programIDs && programIDs.length > 0
            ? programNames(statePrograms, programIDs)
            : programNames(statePrograms, pkg.programIDs)
    const formattedProgramNames = pNames
        .sort(naturalSort)
        .map((n) =>
            n
                .replace(/\s/g, '-')
                .replace(/[^a-zA-Z0-9+]/g, '')
                .toUpperCase()
        )
        .join('-')
    return `MCR-${pkg.stateCode.toUpperCase()}-${padNumber}-${formattedProgramNames}`
}

const generateRateName = (
    pkg: HealthPlanFormDataType,
    statePrograms: ProgramArgType[]
): string => {
    const {
        rateType,
        rateAmendmentInfo,
        rateDateCertified,
        rateDateEnd,
        rateDateStart,
        rateProgramIDs,
    } = pkg

    let rateName = `${packageName(pkg, statePrograms, rateProgramIDs)}-RATE`

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
        rateName = rateName = rateName.concat(
            '-',
            formatRateNameDate(rateDateCertified)
        )
    }

    return rateName
}

const removeRateRelatedDocuments = (
    documents: SubmissionDocument[]
): SubmissionDocument[] => {
    const noRateDocs: SubmissionDocument[] = []
    documents.forEach((document) => {
        const ratesRelatedDocIndex =
            document.documentCategories.indexOf('RATES_RELATED') === -1
                ? undefined
                : document.documentCategories.indexOf('RATES_RELATED')
        const ratesDocIndex =
            document.documentCategories.indexOf('RATES') === -1
                ? undefined
                : document.documentCategories.indexOf('RATES')
        const includesContractDocs =
            document.documentCategories.includes('CONTRACT_RELATED') ||
            document.documentCategories.includes('CONTRACT')
        if (includesContractDocs) {
            if (ratesDocIndex) {
                document.documentCategories.splice(ratesDocIndex, 1)
            }
            if (ratesRelatedDocIndex) {
                document.documentCategories.splice(ratesRelatedDocIndex, 1)
            }
            noRateDocs.push(document)
        }
    })
    return noRateDocs
}

const removeRatesData = (
    pkg: UnlockedHealthPlanFormDataType
): UnlockedHealthPlanFormDataType => {
    pkg.rateType = undefined
    pkg.rateDateCertified = undefined
    pkg.rateDateStart = undefined
    pkg.rateDateEnd = undefined
    pkg.rateCapitationType = undefined
    pkg.rateAmendmentInfo = undefined
    pkg.actuaryContacts = []
    pkg.rateProgramIDs = []
    pkg.documents = removeRateRelatedDocuments(pkg.documents)
    pkg.rateDocuments = []

    return pkg
}

export {
    hasValidContract,
    hasValidDocuments,
    hasValidSupportingDocumentCategories,
    hasValidRates,
    hasAnyValidRateData,
    isContractOnly,
    isContractAndRates,
    isLockedHealthPlanFormData,
    isUnlockedHealthPlanFormData,
    programNames,
    packageName,
    generateRateName,
    removeRateRelatedDocuments,
    removeRatesData,
}
