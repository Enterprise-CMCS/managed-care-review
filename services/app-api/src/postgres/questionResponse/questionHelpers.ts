import type {
    CMSUsersUnionType,
    IndexContractQuestionsPayload,
    IndexRateQuestionsPayload,
    ContractQuestionType,
    QuestionResponseType,
    RateQuestionType,
} from '../../domain-models'
import type { Prisma } from '@prisma/client'

const questionInclude = {
    documents: {
        orderBy: {
            createdAt: 'desc',
        },
    },
    responses: {
        include: {
            addedBy: true,
            documents: true,
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
const commonQuestionPrismaToDomainType = <
    P extends PrismaQuestionType | PrismaRateQuestionType,
    R extends ContractQuestionType | RateQuestionType,
>(
    prismaQuestion: P
): R =>
    ({
        ...prismaQuestion,
        addedBy: prismaQuestion.addedBy as CMSUsersUnionType,
        responses: prismaQuestion.responses as QuestionResponseType[],
    }) as unknown as R

const questionPrismaToDomainType = (
    prismaQuestion: PrismaQuestionType
): ContractQuestionType => commonQuestionPrismaToDomainType(prismaQuestion)
const rateQuestionPrismaToDomainType = (
    prismaQuestion: PrismaRateQuestionType
): RateQuestionType => commonQuestionPrismaToDomainType(prismaQuestion)

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
    questionInclude,
    questionPrismaToDomainType,
    convertToIndexQuestionsPayload,
    convertToIndexRateQuestionsPayload,
    rateQuestionPrismaToDomainType,
}
