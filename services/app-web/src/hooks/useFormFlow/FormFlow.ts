import {
    EB_SUBMISSION_FORM_ROUTES,
    EQRO_SUBMISSION_FORM_ROUTES,
    type RouteT,
    type RouteTWithUnknown,
} from '@mc-review/constants'
import type {
    ContractFormData,
    ContractSubmissionType,
} from '../../gen/gqlClient'
import { activeFormPages } from '../../pages/StateSubmission/submissionUtils'

/**
 * Everything a form flow may need to decide which of its pages are shown.
 * Add new inputs here (another feature flag, more form data) rather than
 * threading them through each page.
 */
type FormFlowContext = {
    formData?: ContractFormData
    hideSupportingDocs: boolean
    showProcurementAttestation: boolean
}

type CustomPageTitles = Partial<Record<RouteTWithUnknown, string>>

type FormFlowDefinition = {
    // The flow's pages, in order. Use a function when the pages depend on the
    // submission or feature flags; it returns only the pages that are shown.
    pages:
        | RouteTWithUnknown[]
        | ((context: FormFlowContext) => RouteTWithUnknown[])
    // Step indicator titles that differ from the default page titles
    customPageTitles?: CustomPageTitles
}

// Health plan pages depend on form data and feature flags; activeFormPages holds those rules.
// TODO: move the rules here when the health plan pages switch to useFormFlow.
const getHealthPlanPages = ({
    formData,
    hideSupportingDocs,
    showProcurementAttestation,
}: FormFlowContext): RouteTWithUnknown[] =>
    activeFormPages(formData, hideSupportingDocs, showProcurementAttestation)

/**
 * The single source of truth for each submission type's form flow.
 *
 * Keyed by the GraphQL ContractSubmissionType enum, so adding a new submission
 * type fails type checking until its flow is defined here. Pages then get their
 * step list, previous and next pages from useFormFlow instead of hard-coding them.
 */
const FORM_FLOWS: Record<ContractSubmissionType, FormFlowDefinition> = {
    HEALTH_PLAN: {
        pages: getHealthPlanPages,
    },
    EQRO: {
        pages: EQRO_SUBMISSION_FORM_ROUTES,
        customPageTitles: { SUBMISSIONS_TYPE: 'Submission details' },
    },
    ENROLLMENT_BROKER: {
        pages: EB_SUBMISSION_FORM_ROUTES,
        customPageTitles: { SUBMISSIONS_TYPE: 'Submission details' },
    },
    // ILOS form pages are not built yet. Fill this in with the ILOS frontend work.
    ILOS: {
        pages: [],
    },
}

/** The pages shown for this submission, in order. */
const getActiveFormPages = (
    contractSubmissionType: ContractSubmissionType,
    context: FormFlowContext
): RouteTWithUnknown[] => {
    const { pages } = FORM_FLOWS[contractSubmissionType]
    return typeof pages === 'function' ? pages(context) : pages
}

type FormFlow = {
    formPages: RouteTWithUnknown[]
    customPageTitles?: CustomPageTitles
    // Undefined on the first and last pages, or when the current page is not in the flow
    previous?: RouteT
    next?: RouteT
}

/**
 * Works out the step list and the pages before and after the current page,
 * so Back and Continue always follow the order the step indicator shows.
 */
const getFormFlow = (
    contractSubmissionType: ContractSubmissionType,
    currentPage: RouteT,
    context: FormFlowContext
): FormFlow => {
    const formPages = getActiveFormPages(contractSubmissionType, context)
    const index = formPages.indexOf(currentPage)

    // The page `offset` steps from the current one, if there is one
    const pageAt = (offset: number): RouteT | undefined => {
        if (index === -1) return undefined
        const page = formPages[index + offset]
        return page && page !== 'UNKNOWN_ROUTE' ? page : undefined
    }

    return {
        formPages,
        customPageTitles: FORM_FLOWS[contractSubmissionType].customPageTitles,
        previous: pageAt(-1),
        next: pageAt(1),
    }
}

export { FORM_FLOWS, getActiveFormPages, getFormFlow }
export type { FormFlow, FormFlowContext, FormFlowDefinition, CustomPageTitles }
