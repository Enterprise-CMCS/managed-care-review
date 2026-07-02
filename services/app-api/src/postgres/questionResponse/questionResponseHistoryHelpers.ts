import type {
    QuestionHistoryActionInput,
    QuestionHistoryInput,
    QuestionHistoryResponseInput,
} from '../submissionHistoryHelpers'
import type {
    AdminUserType,
    CMSUsersUnionType,
    StateUserType,
} from '../../domain-models'
import type { Prisma, QuestionActionType } from '../../generated/client'

type DirectQuestionAction = 'DELETE' | 'RESTORE'

/**
 * Narrows DB question action rows to the direct lifecycle actions the history
 * builder understands. The Prisma include below should already filter out
 * cascade actions; throwing here catches future query/schema drift.
 */
function toDirectQuestionAction(
    action: QuestionActionType
): DirectQuestionAction {
    if (action === 'DELETE' || action === 'RESTORE') {
        return action
    }

    throw new Error(`Unexpected question history action: ${action}`)
}

/**
 * Shared include shape for contract and rate Q&A history queries.
 *
 * History needs soft-deleted questions/responses so delete/restore events can
 * be shown, but it should only include direct question/response actions.
 * Cascade actions are implementation details of a parent delete and would
 * duplicate the parent event in the action log.
 */
const questionResponseHistoryInclude = {
    addedBy: {
        include: {
            stateAssignments: true,
        },
    },
    actions: {
        // History should show direct lifecycle actions. Cascade actions are
        // implementation fallout from a parent delete and would duplicate the
        // parent event in the action log.
        where: {
            action: {
                in: ['DELETE', 'RESTORE'] satisfies QuestionActionType[],
            },
        },
        include: {
            updatedBy: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    },
    responses: {
        include: {
            addedBy: true,
            actions: {
                // Response cascade actions are skipped for the same reason as
                // question cascade actions: the direct parent delete is the
                // user-visible history event.
                where: {
                    action: {
                        in: [
                            'DELETE',
                            'RESTORE',
                        ] satisfies QuestionActionType[],
                    },
                },
                include: {
                    updatedBy: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    },
} satisfies Prisma.ContractQuestionInclude & Prisma.RateQuestionInclude

type ContractQuestionHistoryPayload = Prisma.ContractQuestionGetPayload<{
    include: typeof questionResponseHistoryInclude
}>

type RateQuestionHistoryPayload = Prisma.RateQuestionGetPayload<{
    include: typeof questionResponseHistoryInclude
}>

type QuestionResponseHistoryPayload =
    | ContractQuestionHistoryPayload
    | RateQuestionHistoryPayload

/**
 * Converts Prisma contract/rate question rows into the narrow input shape used
 * by `buildQuestionResponseHistory`. The store functions keep the model-specific
 * queries, while this mapper keeps the shared Q&A history shape consistent.
 */
function parseQuestionHistory(
    questions: QuestionResponseHistoryPayload[]
): QuestionHistoryInput[] {
    return questions.map(
        (question): QuestionHistoryInput => ({
            createdAt: question.createdAt,
            addedBy: question.addedBy as CMSUsersUnionType,
            actions: question.actions.map(
                (action): QuestionHistoryActionInput => ({
                    createdAt: action.createdAt,
                    action: toDirectQuestionAction(action.action),
                    reason: action.reason,
                    updatedBy: action.updatedBy as AdminUserType,
                })
            ),
            responses: question.responses.map(
                (response): QuestionHistoryResponseInput => ({
                    createdAt: response.createdAt,
                    addedBy: response.addedBy as StateUserType,
                    actions: response.actions.map(
                        (action): QuestionHistoryActionInput => ({
                            createdAt: action.createdAt,
                            action: toDirectQuestionAction(action.action),
                            reason: action.reason,
                            updatedBy: action.updatedBy as AdminUserType,
                        })
                    ),
                })
            ),
        })
    )
}

export {
    questionResponseHistoryInclude,
    parseQuestionHistory,
    type ContractQuestionHistoryPayload,
    type RateQuestionHistoryPayload,
}
