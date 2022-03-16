import { DraftSubmissionType } from './DraftSubmissionType'
import { ProgramT } from './ProgramT'
import { StateSubmissionType } from './StateSubmissionType'
import { SubmissionUnionType } from './SubmissionUnionType'

const isContractOnly = (
    sub: DraftSubmissionType | StateSubmissionType
): boolean => sub.submissionType === 'CONTRACT_ONLY'

const isContractAndRates = (
    sub: DraftSubmissionType | StateSubmissionType
): boolean => sub.submissionType === 'CONTRACT_AND_RATES'

const isRateAmendment = (
    sub: DraftSubmissionType | StateSubmissionType
): boolean => sub.rateType === 'AMENDMENT'

const hasValidContract = (sub: StateSubmissionType): boolean =>
    sub.contractType !== undefined &&
    sub.contractExecutionStatus !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.managedCareEntities.length !== 0 &&
    sub.federalAuthorities.length !== 0

const hasValidRates = (sub: StateSubmissionType): boolean => {
    const validBaseRate =
        sub.rateType !== undefined &&
        sub.rateDateCertified !== undefined &&
        sub.rateDateStart !== undefined &&
        sub.rateDateEnd !== undefined

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

const hasValidDocuments = (sub: StateSubmissionType): boolean => {
    const validRateDocuments =
        sub.submissionType === 'CONTRACT_AND_RATES'
            ? sub.rateDocuments?.length !== 0
            : true

    const validContractDocuments = sub.contractDocuments.length !== 0
    return validRateDocuments && validContractDocuments
}

const hasValidSupportingDocumentCategories = (sub: StateSubmissionType): boolean => {
    // every document must have a category
    if (!sub.documents.every(doc => doc.documentCategories.length > 0)) {
        return false;
    }
    // if the submission is contract-only, all supporting docs must be 'CONTRACT-RELATED
    if (sub.submissionType === 'CONTRACT_ONLY' &&
        sub.documents.length > 0 &&
        !sub.documents.every(doc => doc.documentCategories.includes('CONTRACT_RELATED'))) {
            return false;
        }
    return true;
}

const isStateSubmission = (sub: unknown): sub is StateSubmissionType => {
    if (sub && typeof sub === 'object' && 'status' in sub) {
        const maybeStateSub = sub as StateSubmissionType
        return (
            maybeStateSub.status === 'SUBMITTED' &&
            hasValidContract(maybeStateSub) &&
            hasValidRates(maybeStateSub) &&
            hasValidDocuments(maybeStateSub)
        )
    }
    return false
}

const isDraftSubmission = (sub: unknown): sub is DraftSubmissionType => {
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
    return a.localeCompare(b, "en", { numeric: true })
}

function submissionName(submission: SubmissionUnionType): string {
    const padNumber = submission.stateNumber.toString().padStart(4, '0')
    return `MCR-${submission.stateCode.toUpperCase()}-${submission.programIDs.sort(naturalSort).join('-').toUpperCase()}-${padNumber}`
}

// Pull out the programs names for display from the program IDs
function programNames(programs: ProgramT[], programIDs: string[]): string[] {
    return programIDs.map(id => {
        const program = programs.find(p => p.id === id)
        if (!program) {
            return "Unknown Program"
        }
        return program.name
    })
}

function submissionNameWithPrograms(submission: SubmissionUnionType, statePrograms: ProgramT[]): string {
    const padNumber = submission.stateNumber.toString().padStart(4, '0')
    const pNames = programNames(statePrograms, submission.programIDs)
    const formattedProgramNames = pNames.sort(naturalSort).map(n => n.replace(/\s/g, '-').replace(/[^a-zA-Z0-9+]/g, '').toUpperCase()).join('-')
    return `MCR-${submission.stateCode.toUpperCase()}-${formattedProgramNames}-${padNumber}`
}

export {
    hasValidContract,
    hasValidDocuments,
    hasValidSupportingDocumentCategories,
    hasValidRates,
    isContractOnly,
    isContractAndRates,
    isStateSubmission,
    isDraftSubmission,
    submissionName,
    submissionNameWithPrograms,
}
