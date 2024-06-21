import type { StateUserType } from './UserType'

type QuestionResponseDocument = {
    name: string
    s3URL: string
    downloadURL?: string
}

type QuestionResponseType = {
    id: string
    questionID: string
    createdAt: Date
    addedBy: StateUserType
    documents: QuestionResponseDocument[]
}

type InsertQuestionResponseArgs = {
    questionID: string
    documents: QuestionResponseDocument[]
}

export type {
    InsertQuestionResponseArgs,
    QuestionResponseType,
    QuestionResponseDocument,
}
