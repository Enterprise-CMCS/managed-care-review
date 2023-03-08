import { useDocument } from './useDocument'
import { CmsUser, QuestionEdge, StateUser } from '../gen/gqlClient'
import {
    QuestionData,
    QuestionDocumentWithLink,
    ResponseData,
} from '../pages/QuestionResponse/QATable/QATable'

const useQuestions = () => {
    const { getDocumentsUrl } = useDocument()

    const extractQuestions = async (
        edges: QuestionEdge[]
    ): Promise<QuestionData[]> => {
        const questions = await Promise.all(
            edges.map(async ({ node }) => ({
                id: node.id,
                pkgID: node.pkgID,
                createdAt: node.createdAt,
                addedBy: node.addedBy as CmsUser,
                documents: (await getDocumentsUrl(
                    node.documents,
                    'QUESTION_ANSWER_DOCS'
                )) as QuestionDocumentWithLink[],
                responses: (await Promise.all(
                    node.responses.map(async (response) => ({
                        id: response.id,
                        questionID: response.questionID,
                        createdAt: response.createdAt,
                        addedBy: response.addedBy as StateUser,
                        documents: await getDocumentsUrl(
                            response.documents,
                            'QUESTION_ANSWER_DOCS'
                        ),
                    }))
                )) as ResponseData[],
            }))
        ).catch((err) => {
            console.info(err)
            return []
        })

        return questions
    }

    return { extractQuestions }
}

export { useQuestions }
