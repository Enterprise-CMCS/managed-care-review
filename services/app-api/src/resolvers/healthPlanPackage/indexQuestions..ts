import { IndexQuestionsPayload } from '../../domain-models'
import { QueryResolvers } from '../../gen/gqlServer'
import { Store } from '../../postgres'

export function indexQuestionsResolver(
    store: Store
): QueryResolvers['indexQuestions'] {
    return async (_parent, _args, context) => {
        const { user, span } = context
        console.info(user, span)
        const indexQuestions: IndexQuestionsPayload = {
            DMCOQuestions: {
                totalCount: 1,
                edges: [
                    {
                        node: {
                            id: 'testID',
                            pkgID: 'testPackageID',
                            dateAdded: new Date('2023-01-01'),
                            addedBy: {
                                id: 'testUSerID',
                                role: 'CMS_USER',
                                email: 'test@example.com',
                                givenName: 'testFirstName',
                                familyName: 'testLastName',
                                stateAssignments: [],
                            },
                            documents: [
                                {
                                    name: 'testDoc',
                                    s3URL: '//tests3URL',
                                },
                            ],
                            noteText: 'TestNote',
                            dueDate: new Date('2023-04-01'),
                            rateIDs: [],
                            responses: [],
                        },
                    },
                ],
            },
            DMCPQuestions: {
                totalCount: 0,
                edges: [],
            },
            OACTQuestions: {
                totalCount: 0,
                edges: [],
            },
        }

        return indexQuestions
    }
}
