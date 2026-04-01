import type { Span } from '@opentelemetry/api'
import { GraphQLError } from 'graphql'
import { createForbiddenError } from '../errorUtils'
import {
    hasAdminPermissions,
    hasCMSPermissions,
    isStateUser,
} from '../../domain-models/user'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { logError } from '../../logger'
import type { Store } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { ProgramType, StrippedContractType } from '../../domain-models'
import type { StrippedContractOrErrorArrayType } from '../../postgres/contractAndRates/findAllContractsStripped'
import type { SDPDashboardRow } from '../../postgres/sdp/findAllSDPsForDashboard'
import { canRead } from '../../authorization/oauthAuthorization'

type DashboardSubmission = {
    id: string
    name: string
    stateName: string
    stateCode: string
    programs: ProgramType[]
    submittedAt?: Date
    updatedAt: Date
    status:
        | 'DRAFT'
        | 'SUBMITTED'
        | 'UNLOCKED'
        | 'RESUBMITTED'
        | 'APPROVED'
        | 'WITHDRAWN'
        | 'NOT_SUBJECT_TO_REVIEW'
    contractSubmissionType: 'HEALTH_PLAN' | 'EQRO' | 'SDP'
    submissionType?: string
}

const contractSubmissionTypeLabel = (value: string | undefined) => {
    switch (value) {
        case 'CONTRACT_ONLY':
            return 'Contract action only'
        case 'CONTRACT_AND_RATES':
            return 'Contract action and rate certification'
        default:
            return undefined
    }
}

const sdpSubmissionTypeLabel = (value: string) => {
    switch (value) {
        case 'NEW_STATE_DIRECTED_PAYMENT_PREPRINT':
            return 'New state directed payment preprint'
        case 'AMENDMENT_TO_AN_APPROVED_PREPRINT':
            return 'Amendment to an approved preprint'
        case 'RENEWAL_FOR_NEW_RATING_PERIOD':
            return 'Renewal for new rating period'
        default:
            return 'State Directed Preprint'
    }
}

const sdpSubmissionName = (stateCode: string, stateNumber: number) =>
    `MCR-${stateCode}-${String(stateNumber).padStart(4, '0')}-SDP`

const fallbackContractSubmissionName = (
    stateCode: string,
    stateNumber: number,
    contractSubmissionType: 'HEALTH_PLAN' | 'EQRO'
) =>
    `MCR-${stateCode}-${String(stateNumber).padStart(
        4,
        '0'
    )}-${contractSubmissionType}`

const mostRecentDate = (dates: Array<Date | undefined>) => {
    let maxDate: Date | undefined

    for (const date of dates) {
        if (date && (!maxDate || date.getTime() > maxDate.getTime())) {
            maxDate = date
        }
    }

    return maxDate
}

const validateAndReturnContracts = (
    results: StrippedContractOrErrorArrayType,
    span?: Span
): StrippedContractType[] => {
    const parsedContracts: StrippedContractType[] = []
    const errorParseContracts: string[] = []

    results.forEach((parsed) => {
        if (parsed.contract instanceof Error) {
            errorParseContracts.push(
                `${parsed.contractID}: ${parsed.contract.message}`
            )
        } else {
            parsedContracts.push(parsed.contract)
        }
    })

    if (errorParseContracts.length > 0) {
        const errMessage = `Failed to parse the following contracts:\n${errorParseContracts.join(
            '\n'
        )}`
        logError('indexSubmissions', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
    }

    return parsedContracts
}

const mapContractToSubmission = (
    contract: StrippedContractType,
    stateNameByCode: Record<string, string>,
    store: Store
): DashboardSubmission | undefined => {
    if (contract.contractSubmissionType === 'SDP') {
        return undefined
    }

    const status =
        contract.reviewStatus !== 'UNDER_REVIEW'
            ? contract.reviewStatus
            : contract.status
    const currentRevision =
        contract.status === 'SUBMITTED' || contract.status === 'RESUBMITTED'
            ? contract.latestSubmittedRevision
            : contract.draftRevision

    if (!currentRevision) {
        return undefined
    }

    const reviewUpdatedAt = contract.reviewStatusActions?.[0]?.updatedAt
    const lastUpdated =
        mostRecentDate([
            contract.updatedAt,
            currentRevision.updatedAt,
            contract.draftRevision?.updatedAt,
            reviewUpdatedAt,
        ]) ?? currentRevision.updatedAt

    const programsResult = store.findPrograms(
        contract.stateCode,
        currentRevision.formData.programIDs
    )
    const submissionName = fallbackContractSubmissionName(
        contract.stateCode,
        contract.stateNumber,
        contract.contractSubmissionType
    )

    return {
        id: contract.id,
        name: submissionName,
        stateName: stateNameByCode[contract.stateCode] ?? contract.stateCode,
        stateCode: contract.stateCode,
        programs: programsResult instanceof Error ? [] : programsResult,
        submittedAt: contract.initiallySubmittedAt,
        updatedAt: lastUpdated,
        status,
        contractSubmissionType: contract.contractSubmissionType,
        submissionType: contractSubmissionTypeLabel(
            currentRevision.formData.submissionType
        ),
    }
}

const mapSDPToSubmission = (
    sdp: SDPDashboardRow,
    programs: ProgramType[] | Error
): DashboardSubmission => ({
    id: sdp.id,
    name: sdpSubmissionName(sdp.stateCode, sdp.stateNumber),
    stateName: sdp.stateName,
    stateCode: sdp.stateCode,
    programs: programs instanceof Error ? [] : programs,
    submittedAt: sdp.status === 'SUBMITTED' ? sdp.updatedAt : undefined,
    updatedAt: sdp.updatedAt,
    status: sdp.status as DashboardSubmission['status'],
    contractSubmissionType: 'SDP',
    submissionType: sdpSubmissionTypeLabel(sdp.submissionType),
})

export function indexSubmissions(
    store: Store
): QueryResolvers['indexSubmissions'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexSubmissions', {}, ctx)
        setResolverDetailsOnActiveSpan('indexSubmissions', user, span)

        if (!canRead(context)) {
            const errMsg = 'OAuth client does not have read permissions'
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw createForbiddenError(errMsg)
        }

        const adminPermissions = hasAdminPermissions(user)
        const cmsUser = hasCMSPermissions(user)
        const stateUser = isStateUser(user)

        if (!adminPermissions && !cmsUser && !stateUser) {
            const errMsg = 'user not authorized to fetch submissions data'
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw createForbiddenError(errMsg)
        }

        const requestedStateCode = stateUser ? user.stateCode : input?.stateCode
        const includeDrafts = stateUser
        const supportedStates = await store.findAllSupportedStates()

        if (supportedStates instanceof Error) {
            const errMessage = `Issue finding supported states for submissions index: ${supportedStates.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const stateNameByCode = Object.fromEntries(
            supportedStates.map((state) => [state.stateCode, state.name])
        )

        const contractsResult = await store.findAllContractsStripped({
            stateCode: requestedStateCode ?? undefined,
            includeDrafts,
        })

        if (contractsResult instanceof Error) {
            const errMessage = `Issue finding contracts for submissions index: ${contractsResult.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const sdpsResult = await store.findAllSDPsForDashboard({
            stateCode: requestedStateCode ?? undefined,
            includeDrafts,
        })

        if (sdpsResult instanceof Error) {
            const errMessage = `Issue finding SDPs for submissions index: ${sdpsResult.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const contractSubmissions = validateAndReturnContracts(
            contractsResult,
            span
        )
            .map((contract) =>
                mapContractToSubmission(contract, stateNameByCode, store)
            )
            .filter(
                (submission): submission is DashboardSubmission =>
                    submission !== undefined
            )

        const sdpSubmissions = sdpsResult.map((sdp) =>
            mapSDPToSubmission(
                sdp,
                store.findPrograms(sdp.stateCode, sdp.programIDs)
            )
        )

        let submissions = [...contractSubmissions, ...sdpSubmissions]

        if (!stateUser) {
            submissions = submissions.filter(
                (submission) =>
                    submission.status !== 'DRAFT' &&
                    submission.status !== 'UNLOCKED'
            )
        }

        const statusesToExclude = input?.statusesToExclude?.filter(
            (status): status is DashboardSubmission['status'] => status != null
        )

        if (statusesToExclude && statusesToExclude.length > 0) {
            submissions = submissions.filter(
                (submission) => !statusesToExclude.includes(submission.status)
            )
        }

        if (input?.updatedWithin) {
            const cutoff = new Date(Date.now() - input.updatedWithin * 1000)
            submissions = submissions.filter(
                (submission) => submission.updatedAt > cutoff
            )
        }

        submissions.sort((a, b) =>
            a.updatedAt.getTime() > b.updatedAt.getTime() ? -1 : 1
        )

        setSuccessAttributesOnActiveSpan(span)

        return {
            totalCount: submissions.length,
            edges: submissions.map((submission) => ({
                node: submission,
            })),
        }
    }
}
