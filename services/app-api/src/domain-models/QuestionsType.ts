import { CMSUserType, StateUserType } from './UserType'

type Document = {
    name: string
    s3URL: string
}

type QuestionResponse = {
    id: string
    questionID: string
    dateAdded: Date
    addedBy: StateUserType
    documents: [Document]
    noteText?: string
}

type Question = {
    id: string
    pkgID: string
    dateAdded: Date
    addedBy: CMSUserType
    documents: [Document]
    noteText?: string
    dueDate?: Date
    rateIDs: string[]

    responses: QuestionResponse[]
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

export { IndexQuestionsPayload }
