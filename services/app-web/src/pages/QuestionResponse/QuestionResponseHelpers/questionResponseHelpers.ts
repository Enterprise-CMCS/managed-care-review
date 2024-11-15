import { flatten } from 'cypress/types/lodash'
import {
    CmsUser,
    CmsUsersUnion,
    ContractQuestion,
    ContractQuestionEdge,
    Document,
    IndexContractQuestionsPayload,
    IndexRateQuestionsPayload,
    QuestionResponse,
    RateQuestion,
    RateQuestionEdge,
    StateUser,
    User,
} from '../../../gen/gqlClient'
import { Division } from '../../../gen/gqlClient'
import { a } from 'vitest/dist/suite-IbNSsUWN'

type QuestionData = {
    id: string
    createdAt: Date
    addedBy: User
    documents: Document[]
    responses: QuestionResponse[]
}

type QuestionDisplayDocument = {
    createdAt: Date
    addedBy: CmsUsersUnion | StateUser
    downloadURL: string | null
    name: string
    s3URL: string
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

type QuestionType =
    | Omit<RateQuestion, 'rateID'>
    | Omit<ContractQuestion, 'contractID'>

const divisionFullNames = {
    DMCO: 'Division of Managed Care Operations (DMCO)',
    DMCP: 'Division of Managed Care Policy (DMCP)',
    OACT: 'Office of the Actuary (OACT)',
}

const extractQuestions = (
    questions?: IndexRateQuestionsPayload | IndexContractQuestionsPayload
): QuestionType[] => {
    if (!questions) return []

    const combinedEdges = [
        ...questions.DMCOQuestions.edges,
        ...questions.DMCPQuestions.edges,
        ...questions.OACTQuestions.edges,
    ]

    const flattenedQuestions: QuestionType[] = combinedEdges.map(
        (edge) => edge.node
    )
    return flattenedQuestions
}

// Combines question and response documents and sorts them in desc order.
const extractDocumentsFromQuestion = (
    question: QuestionType
): QuestionDisplayDocument[] => {
    const documents = [
        ...question.documents.map((doc) => ({
            ...doc,
            createdAt: question.createdAt,
            addedBy: question.addedBy,
            downloadURL: doc.downloadURL ?? null,
        })),
        ...question.responses.flatMap((response) =>
            response.documents.map((doc) => ({
                ...doc,
                createdAt: response.createdAt,
                addedBy: response.addedBy,
                downloadURL: doc.downloadURL ?? null,
            }))
        ),
    ].sort((a, b) =>
        new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime()
            ? -1
            : 1
    )
    return documents
}

const getUserDivision = (user: CmsUser): Division | undefined => {
    if (user.divisionAssignment) {
        return user.divisionAssignment
    }
    return undefined
}

function isValidCmsDivison(division: string): division is Division {
    return ['DMCO', 'DMCP', 'OACT'].includes(division)
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


// This generic type is the minimal subset of Rate and Contract Questions needed to compute round number
interface GenericQuestionNode {
    node: {id: string}
}

interface GenericQuestionsList {
    edges: Array<GenericQuestionNode>
}

interface GenericQuestionsPayload {
      DMCOQuestions: GenericQuestionsList
      DMCPQuestions: GenericQuestionsList;
      OACTQuestions: GenericQuestionsList
}

// gets question round for a division to display -  default to 0 if API response isn't matching up as expected
const getQuestionRoundForQuestionID = (
    questions: GenericQuestionsPayload,
    division: Division,
    questionID: string
): number => {
    const questionsEdges = questions?.[`${division}Questions`].edges

    const matchingQuestion = questionsEdges.find(
        (question) => question.node.id == questionID
    )
    if (!matchingQuestion) {
        return 0
    } else {
        return questionsEdges.indexOf(matchingQuestion) !== undefined
            ? questionsEdges.indexOf(matchingQuestion) + 1
            : 0
    }
}

const getNextCMSRoundNumber = (
    questions: GenericQuestionsPayload,
    division: Division
): number => {
    const questionsEdges = questions?.[`${division}Questions`].edges
    return questionsEdges.length + 1
}

const getAddedByName = (currentUser: User, addedBy: User) => {
    const currentIsStateUser = currentUser.role === 'StateUser'

    if (currentUser?.id === addedBy.id) {
        return 'You'
    }
    if (
        addedBy.__typename === 'CMSUser' ||
        addedBy.__typename === 'CMSApproverUser'
    ) {
        return `${addedBy.givenName} ${currentIsStateUser ? '(CMS)' : ''}`
    }
    if (addedBy.__typename === 'StateUser') {
        return `${addedBy.givenName} (${addedBy.state.code})`
    }
    return `${addedBy.givenName}`
}

export {
    extractQuestions,
    getUserDivision,
    getDivisionOrder,
    getQuestionRoundForQuestionID,
    getNextCMSRoundNumber,
    divisionFullNames,
    getAddedByName,
    extractDocumentsFromQuestion,
    isValidCmsDivison,
}

export type {
    QuestionData,
    QuestionDocumentWithLink,
    DivisionQuestionDataType,
    IndexQuestionType,
    QuestionDisplayDocument,
    QuestionType,
}
