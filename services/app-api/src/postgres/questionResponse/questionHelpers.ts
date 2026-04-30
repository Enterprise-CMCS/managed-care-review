import type {
    AdminUserType,
    CMSUsersUnionType,
    IndexContractQuestionsPayload,
    IndexRateQuestionsPayload,
    ContractQuestionType,
    QuestionAction,
    QuestionResponseType,
    RateQuestionType,
} from '../../domain-models'
import type { Prisma, QuestionActionType } from '../../generated/client'

const DELETE_ACTIONS = new Set<QuestionActionType>(['DELETE', 'CASCADE_DELETE'])

// Works for any Q&A parent — their action rows all share QuestionActionType.
// This filters out soft deleted questions, may not want this if we want to
// expose soft deleted questions for future UI or API consumer usage
const isDeleted = (row: {
    actions: { action: QuestionActionType }[]
}): boolean => {
    const latest = row.actions[0]
    return latest !== undefined && DELETE_ACTIONS.has(latest.action)
}

// Query question, response and actions log for filtering soft deleted Q&A
const questionInclude = {
    documents: {
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            actions: {
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1,
            },
        },
    },
    actions: {
        orderBy: {
            createdAt: 'desc',
        },
        take: 1,
        include: {
            updatedBy: true,
        },
    },
    responses: {
        include: {
            addedBy: true,
            documents: {
                include: {
                    actions: {
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 1,
                    },
                },
            },
            actions: {
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1,
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    },
    addedBy: {
        include: {
            stateAssignments: true,
        },
    },
} satisfies Prisma.ContractQuestionInclude | Prisma.RateQuestionInclude

type PrismaQuestionType = Prisma.ContractQuestionGetPayload<{
    include: typeof questionInclude
}>

type PrismaRateQuestionType = Prisma.RateQuestionGetPayload<{
    include: typeof questionInclude
}>

// Both types are similar only difference is one related to a contract and the other a rate.
// Pure shape conversion — does NOT filter soft-deleted descendants. Callers
// that want a filtered view should pre-filter with `filterDeletedDescendants`.
const commonQuestionPrismaToDomainType = <
    P extends PrismaQuestionType | PrismaRateQuestionType,
    R extends ContractQuestionType | RateQuestionType,
>(
    prismaQuestion: P
): R =>
    ({
        ...prismaQuestion,
        addedBy: prismaQuestion.addedBy as CMSUsersUnionType,
        actions: prismaQuestion.actions.map((a) => ({
            id: a.id,
            createdAt: a.createdAt,
            action: a.action,
            reason: a.reason,
            updatedBy: a.updatedBy as AdminUserType,
        })) as QuestionAction[],
        responses: prismaQuestion.responses as QuestionResponseType[],
    }) as unknown as R

// Drops deleted questions and strips deleted docs/responses/response-docs.
// Use for the read-side view; skip when surfacing deletes (e.g. delete resolver).
const filterDeletedDescendants = <
    P extends PrismaQuestionType | PrismaRateQuestionType,
>(
    prismaQuestions: P[]
): P[] => {
    const result: P[] = []
    for (const question of prismaQuestions) {
        if (isDeleted(question)) continue
        const responses = []
        for (const response of question.responses) {
            if (isDeleted(response)) continue
            responses.push({
                ...response,
                documents: response.documents.filter((d) => !isDeleted(d)),
            })
        }
        result.push({
            ...question,
            documents: question.documents.filter((d) => !isDeleted(d)),
            responses,
        } as P)
    }
    return result
}

const contractQuestionPrismaToDomainType = (
    prismaQuestion: PrismaQuestionType
): ContractQuestionType => commonQuestionPrismaToDomainType(prismaQuestion)
const rateQuestionPrismaToDomainType = (
    prismaQuestion: PrismaRateQuestionType
): RateQuestionType => commonQuestionPrismaToDomainType(prismaQuestion)

// This filters out soft deleted questions, may not want this if we want to display soft deleted questions
const convertNonDeletedContractQuestions = (
    questions: PrismaQuestionType[]
): ContractQuestionType[] =>
    filterDeletedDescendants(questions).map(contractQuestionPrismaToDomainType)

const convertNonDeletedRateQuestions = (
    questions: PrismaRateQuestionType[]
): RateQuestionType[] =>
    filterDeletedDescendants(questions).map(rateQuestionPrismaToDomainType)

const convertToCommonIndexQuestionsPayload = <
    P extends ContractQuestionType | RateQuestionType,
    R extends IndexContractQuestionsPayload | IndexRateQuestionsPayload,
>(
    questions: P[]
): R => {
    const getDivisionQuestionsEdge = (
        division: 'DMCP' | 'DMCO' | 'OACT',
        questions: P[]
    ) => ({
        totalCount: questions.filter((q) => q.division === division).length,
        edges: questions
            .filter((q) => q.division === division)
            .map((question) => ({ node: question })),
    })

    return {
        DMCOQuestions: getDivisionQuestionsEdge('DMCO', questions),
        DMCPQuestions: getDivisionQuestionsEdge('DMCP', questions),
        OACTQuestions: getDivisionQuestionsEdge('OACT', questions),
    } as unknown as R
}

const convertToIndexQuestionsPayload = (
    contractQuestions: ContractQuestionType[]
): IndexContractQuestionsPayload =>
    convertToCommonIndexQuestionsPayload(contractQuestions)
const convertToIndexRateQuestionsPayload = (
    rateQuestions: RateQuestionType[]
): IndexRateQuestionsPayload =>
    convertToCommonIndexQuestionsPayload(rateQuestions)

export {
    DELETE_ACTIONS,
    isDeleted,
    questionInclude,
    filterDeletedDescendants,
    contractQuestionPrismaToDomainType,
    rateQuestionPrismaToDomainType,
    convertNonDeletedContractQuestions,
    convertNonDeletedRateQuestions,
    convertToIndexQuestionsPayload,
    convertToIndexRateQuestionsPayload,
}
