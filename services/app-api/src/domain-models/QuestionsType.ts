import { CMSUserType } from './UserType'

type Document = {
    name: string
    s3URL: string
}

type Question = {
    id: string
    pkgID: string
    createdAt: Date
    addedBy: CMSUserType
    documents: Document[]
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
    pkgID: string
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
