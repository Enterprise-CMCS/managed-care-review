import {
    CmsUser,
    ContractQuestion,
    ContractQuestionEdge,
    Document, IndexContractQuestionsPayload, IndexRateQuestionsPayload,
    QuestionResponse,
    RateQuestion,
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

type IndexQuestionType =
    | IndexContractQuestionsPayload
    | IndexRateQuestionsPayload


const divisionFullNames = {
    DMCO: 'Division of Managed Care Operations (DMCO)',
    DMCP: 'Division of Managed Care Policy (DMCP)',
    OACT: 'Office of the Actuary (OACT)'
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


const getQuestionRoundForQuestionID = (questions: IndexRateQuestionsPayload | IndexContractQuestionsPayload, division: Division, questionID: string): number |
undefined =>{
    const questionsEdges =  questions?.[`${division}Questions`].edges
   const matchingQuestion = questionsEdges.find( (question ) => question.node.id == questionID)
   if (!matchingQuestion){
    return undefined
   } else {
    // @ts-expect-error cannot infer wether contract or rate question edge expected
    return  questionsEdges.indexOf(matchingQuestion) + 1
   }
}


export {
    extractQuestions,
    getUserDivision,
    getDivisionOrder,
    getQuestionRoundForQuestionID,
    divisionFullNames
}

export type {
    QuestionData,
    QuestionDocumentWithLink,
    DivisionQuestionDataType,
    IndexQuestionType
}
