import { z } from 'zod'
import { stateUserSchema } from './UserType'

const questionResponseDocument = z.object({
    name: z.string(),
    s3URL: z.string(),
    downloadURL: z.string().optional(),
})

const questionResponseType = z.object({
    id: z.string().uuid(),
    questionID: z.string().uuid(),
    createdAt: z.date(),
    addedBy: stateUserSchema,
    documents: z.array(questionResponseDocument),
})

const insertQuestionResponseArgs = z.object({
    questionID: z.string().uuid(),
    documents: z.array(questionResponseDocument),
})

type QuestionResponseDocument = z.infer<typeof questionResponseDocument>

type QuestionResponseType = z.infer<typeof questionResponseType>

type InsertQuestionResponseArgs = z.infer<typeof insertQuestionResponseArgs>

export type {
    InsertQuestionResponseArgs,
    QuestionResponseType,
    QuestionResponseDocument,
}

export {
    insertQuestionResponseArgs,
    questionResponseType,
    questionResponseDocument,
}
