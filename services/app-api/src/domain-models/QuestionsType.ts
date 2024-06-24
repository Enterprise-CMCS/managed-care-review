import type { CMSUserType } from './UserType'
import type { QuestionResponseType } from './QuestionResponseType'
import type { DivisionType } from './DivisionType'

type Document = {
    name: string
    s3URL: string
    downloadURL?: string
}

type Question = {
    id: string
    contractID: string
    createdAt: Date
    addedBy: CMSUserType
    documents: Document[]
    division: DivisionType
    responses: QuestionResponseType[]
}

type QuestionList = {
    totalCount: number
    edges: QuestionEdge[]
}

type QuestionEdge = {
    node: Question
}

type IndexQuestionsPayload = {
    //"Questions for a given submission that were asked by DMCO within CMS"
    DMCOQuestions: QuestionList
    //"Questions for a given submission that were asked by DMCP within CMS"
    DMCPQuestions: QuestionList
    //"Questions for a given submission that were asked by OACT within CMS"
    OACTQuestions: QuestionList
}

type CreateQuestionPayload = {
    question: Question
}

type CreateQuestionInput = {
    contractID: string
    documents: Document[]
}

export type {
    IndexQuestionsPayload,
    CreateQuestionPayload,
    CreateQuestionInput,
    Question,
    Document,
    QuestionList,
}
