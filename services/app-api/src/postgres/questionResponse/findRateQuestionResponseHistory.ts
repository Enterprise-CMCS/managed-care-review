import { parseErrorToError } from '@mc-review/helpers'
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
import type { ExtendedPrismaClient } from '../prismaClient'

type DirectQuestionAction = 'DELETE' | 'RESTORE'

const directQuestionActionTypes: QuestionActionType[] = ['DELETE', 'RESTORE']

// History should show direct question/response lifecycle actions. Cascade
// actions are implementation fallout from a parent delete and would duplicate
// the parent event in the action log.
const directQuestionActionFilter = {
    action: {
        in: directQuestionActionTypes,
    },
}

const rateQuestionHistoryInclude = {
    addedBy: {
        include: {
            stateAssignments: true,
        },
    },
    actions: {
        where: directQuestionActionFilter,
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
                where: directQuestionActionFilter,
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
} satisfies Prisma.RateQuestionInclude

type RateQuestionHistoryResult = Prisma.RateQuestionGetPayload<{
    include: typeof rateQuestionHistoryInclude
}>

export async function findRateQuestionResponseHistory(
    client: ExtendedPrismaClient,
    rateID: string
): Promise<QuestionHistoryInput[] | Error> {
    try {
        // Do not use findAllQuestionsByRate here. That function is shaped for
        // display and filters soft-deleted Q&A, but history needs deleted
        // questions/responses so their delete actions can still be logged.
        const questions = (await client.rateQuestion.findMany({
            where: {
                rateID,
            },
            include: rateQuestionHistoryInclude,
            orderBy: {
                createdAt: 'desc',
            },
        })) as RateQuestionHistoryResult[]

        // Return only the fields the history builder needs. This keeps the
        // store return type separate from the full Q&A display domain model.
        return questions.map((question) => ({
            createdAt: question.createdAt,
            addedBy: question.addedBy as CMSUsersUnionType,
            actions: question.actions.map((action) => ({
                createdAt: action.createdAt,
                action: action.action as DirectQuestionAction,
                reason: action.reason,
                updatedBy: action.updatedBy as AdminUserType,
            })) as QuestionHistoryActionInput[],
            responses: question.responses.map((response) => ({
                createdAt: response.createdAt,
                addedBy: response.addedBy as StateUserType,
                actions: response.actions.map((action) => ({
                    createdAt: action.createdAt,
                    action: action.action as DirectQuestionAction,
                    reason: action.reason,
                    updatedBy: action.updatedBy as AdminUserType,
                })) as QuestionHistoryActionInput[],
            })) as QuestionHistoryResponseInput[],
        }))
    } catch (e) {
        return parseErrorToError(e)
    }
}
