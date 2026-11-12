import { useMemo } from 'react'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import {
    ContractSubmissionTypeRecord,
    type ContractSubmissionTypeParams,
    type RouteT,
} from '@mc-review/constants'
import { recordJSException } from '@mc-review/otel'
import type { ContractFormData, ContractSubmissionType } from '../gen/gqlClient'
import {
    FORM_FLOWS,
    getFormFlow,
    type FormFlow,
} from '../pages/StateSubmission/FormFlow'
import { getSubmissionPath } from '../routeHelpers'
import { useRouteParams } from './useRouteParams'

type UseFormFlowOptions = {
    // Needed by flows with pages that depend on the draft (health plan).
    // Safe to pass undefined while the draft is loading.
    formData?: ContractFormData
    // Overrides the submission type read from the URL, for routes that don't carry it
    // (e.g. the legacy /submissions/new health plan route)
    contractSubmissionType?: ContractSubmissionType
}

type UseFormFlow = FormFlow & {
    contractSubmissionType?: ContractSubmissionType
    // Ready to pass to navigate(); undefined when there is no such page or no submission id yet
    previousPath?: string
    nextPath?: string
    // Spread onto <DynamicStepIndicator />
    stepIndicatorProps: {
        formPages: FormFlow['formPages']
        currentFormPage: RouteT
        customPageTitles?: FormFlow['customPageTitles']
    }
}

// Turns the URL segment (e.g. 'eb') back into the submission type (e.g. 'ENROLLMENT_BROKER')
const submissionTypeFromParam = (
    param?: ContractSubmissionTypeParams
): ContractSubmissionType | undefined =>
    (Object.keys(FORM_FLOWS) as ContractSubmissionType[]).find(
        (type) => ContractSubmissionTypeRecord[type] === param
    )

/**
 * The form flow for the submission in the current URL: its step list, and the
 * pages before and after `currentPage`.
 *
 *   const { previous, next } = useFormFlow('SUBMISSIONS_CONTACTS')
 *
 * Flows are defined once per submission type in FORM_FLOWS (pages/StateSubmission/formFlow.ts).
 */
const useFormFlow = (
    currentPage: RouteT,
    {
        formData,
        contractSubmissionType: submissionTypeOverride,
    }: UseFormFlowOptions = {}
): UseFormFlow => {
    const { id, contractSubmissionType: submissionTypeParam } = useRouteParams()
    const ldClient = useLDClient()

    const hideSupportingDocs: boolean = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )
    const showProcurementAttestation: boolean = ldClient?.variation(
        featureFlags.PROCUREMENT_ATTESTATION.flag,
        featureFlags.PROCUREMENT_ATTESTATION.defaultValue
    )

    const contractSubmissionType =
        submissionTypeOverride ?? submissionTypeFromParam(submissionTypeParam)

    return useMemo(() => {
        if (!contractSubmissionType) {
            // Routes outside a submission form (e.g. standalone rate edit) have no flow
            return {
                formPages: [],
                currentPage,
                stepIndicatorProps: {
                    formPages: [],
                    currentFormPage: currentPage,
                },
            }
        }

        const flow = getFormFlow(contractSubmissionType, currentPage, {
            formData,
            hideSupportingDocs: Boolean(hideSupportingDocs),
            showProcurementAttestation: Boolean(showProcurementAttestation),
        })

        // A page asking for a flow it isn't part of means FORM_FLOWS is out of date.
        // Skip while a conditional flow is still waiting on form data.
        const canCheck =
            formData || !FORM_FLOWS[contractSubmissionType].isPageActive
        if (canCheck && !flow.formPages.includes(currentPage)) {
            recordJSException(
                `useFormFlow: ${currentPage} is not an active page in the ${contractSubmissionType} form flow`
            )
        }

        const toPath = (route?: RouteT) =>
            route && id
                ? getSubmissionPath(route, contractSubmissionType, id)
                : undefined

        return {
            ...flow,
            contractSubmissionType,
            previousPath: toPath(flow.previous),
            nextPath: toPath(flow.next),
            stepIndicatorProps: {
                formPages: flow.formPages,
                currentFormPage: flow.currentPage,
                customPageTitles: flow.customPageTitles,
            },
        }
    }, [
        contractSubmissionType,
        currentPage,
        formData,
        hideSupportingDocs,
        showProcurementAttestation,
        id,
    ])
}

export { useFormFlow }
export type { UseFormFlow, UseFormFlowOptions }
