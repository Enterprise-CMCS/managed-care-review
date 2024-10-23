import {
    CmsUser,
    ContractQuestionEdge,
    Document, IndexContractQuestionsPayload, IndexRateQuestionsPayload,
    QuestionResponse,
    RateQuestionEdge,
    StateUser
} from '../../../gen/gqlClient';
import { Division } from '../../../gen/gqlClient';

type QuestionData = {
    id: string
    createdAt: Date
    addedBy: CmsUser
    documents: Document[]
    responses: QuestionResponse[]
}

type DivisionQuestionDataType = {
    division: Division
    questions: QuestionData[]
}

type QuestionDocumentWithLink = {
    s3URL: string
    name: string
    url?: string | null
}

const extractQuestions = (edges?: (ContractQuestionEdge | RateQuestionEdge)[]): QuestionData[] => {
    if (!edges) {
        return []
    }
    return edges.map(({ node }) => ({
        ...node,
        addedBy: node.addedBy as CmsUser,
        responses: node.responses.map((response) => ({
            ...response,
            addedBy: response.addedBy as StateUser,
        })),
    }))
}

const getUserDivision = (user: CmsUser): Division | undefined => {
    if (user.divisionAssignment) {
        return user.divisionAssignment
    }
    return undefined
}

const getDivisionOrder = (division?: Division): Division[] =>
    ['DMCO', 'DMCP', 'OACT'].sort((a, b) => {
        if (a === division) {
            return -1
        }
        if (b === division) {
            return 1
        }
        return 0
    }) as Division[]

export {
    extractQuestions,
    getUserDivision,
    getDivisionOrder,
}

export type {
    QuestionData,
    QuestionDocumentWithLink,
    DivisionQuestionDataType
}
