import { z } from 'zod'
import * as v from "@badrap/valita";

import { stateUserSchema, valitaStateUserSchema } from './UserType'

const questionResponseDocument = z.object({
    name: z.string(),
    s3URL: z.string(),
    downloadURL: z.string().optional(),
})
const valitaQuestionResponseDocument = v.object({
    name: v.string(),
    s3URL: v.string(),
    downloadURL: v.string().optional(),
})

const questionResponseType = z.object({
    id: z.string().uuid(),
    questionID: z.string().uuid(),
    createdAt: z.date(),
    addedBy: stateUserSchema,
    documents: z.array(questionResponseDocument),
})
const DateType = v.string().chain((s) => {
    const date = new Date(s);
  
    if (isNaN(+date)) {
      return v.err("invalid date");
    }
  
    return v.ok(date);
  });
const valitaQuestionResponseType = v.object({
    id: v.string(), // uuid not supporte
    questionID: DateType, // uuid not supported
    createdAt: DateType, // date not supported
    addedBy: valitaStateUserSchema,
    documents: v.array(valitaQuestionResponseDocument),
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
    valitaQuestionResponseType,
    questionResponseDocument,
}
