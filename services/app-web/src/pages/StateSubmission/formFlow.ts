import {
    EB_SUBMISSION_FORM_ROUTES,
    EQRO_SUBMISSION_FORM_ROUTES,
    STATE_SUBMISSION_FORM_ROUTES,
    type RouteT,
    type RouteTWithUnknown,
} from '@mc-review/constants'
import { activeFormPages } from './submissionUtils'
import type {
    ContractFormData,
    ContractSubmissionType,
} from '../../gen/gqlClient'

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
    // Every page the flow can have, in order
    pages: RouteTWithUnknown[]
    // Step indicator titles that differ from the default page titles
    customPageTitles?: CustomPageTitles
    // Optional filter for pages that only show for some submissions or flags.
    // Leave it out when the flow has no conditional pages.
    isPageActive?: (
        page: RouteTWithUnknown,
        context: FormFlowContext
    ) => boolean
}

// Health plan pages depend on form data and feature flags; activeFormPages holds those rules.
// TODO: move the rules here when the health plan pages switch to useFormFlow.
const isHealthPlanPageActive = (
    page: RouteTWithUnknown,
    {
        formData,
        hideSupportingDocs,
        showProcurementAttestation,
    }: FormFlowContext
): boolean =>
    activeFormPages(
        formData,
        hideSupportingDocs,
        showProcurementAttestation
    ).includes(page)

/**
 * The single source of truth for each submission type's form flow.
 *
 * Keyed by the GraphQL ContractSubmissionType enum, so adding a new submission
 * type fails type checking until its flow is defined here. Pages then get their
 * step list, previous and next pages from useFormFlow instead of hard-coding them.
 */
const FORM_FLOWS: Record<ContractSubmissionType, FormFlowDefinition> = {
    HEALTH_PLAN: {
        pages: STATE_SUBMISSION_FORM_ROUTES,
        isPageActive: isHealthPlanPageActive,
    },
    EQRO: {
        pages: EQRO_SUBMISSION_FORM_ROUTES,
        customPageTitles: { SUBMISSIONS_TYPE: 'Submission details' },
    },
    ENROLLMENT_BROKER: {
        pages: EB_SUBMISSION_FORM_ROUTES,
        customPageTitles: { SUBMISSIONS_TYPE: 'Submission details' },
    },
}

/** The pages shown for this submission, in order. */
const getActiveFormPages = (
    contractSubmissionType: ContractSubmissionType,
    context: FormFlowContext
): RouteTWithUnknown[] => {
    const { pages, isPageActive } = FORM_FLOWS[contractSubmissionType]
    return isPageActive
        ? pages.filter((page) => isPageActive(page, context))
        : pages
}

type FormFlow = {
    formPages: RouteTWithUnknown[]
    customPageTitles?: CustomPageTitles
    currentPage: RouteT
    // Undefined on the first and last pages, or when currentPage is not in the flow
    previous?: RouteT
    next?: RouteT
}

const toRoute = (page?: RouteTWithUnknown): RouteT | undefined =>
    page && page !== 'UNKNOWN_ROUTE' ? page : undefined

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

    return {
        formPages,
        customPageTitles: FORM_FLOWS[contractSubmissionType].customPageTitles,
        currentPage,
        previous: index === -1 ? undefined : toRoute(formPages[index - 1]),
        next: index === -1 ? undefined : toRoute(formPages[index + 1]),
    }
}

export { FORM_FLOWS, getActiveFormPages, getFormFlow }
export type { FormFlow, FormFlowContext, FormFlowDefinition, CustomPageTitles }
