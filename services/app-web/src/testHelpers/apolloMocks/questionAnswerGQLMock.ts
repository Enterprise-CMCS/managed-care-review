import { MockedResponse } from '@apollo/client/testing'
import {
    CreateQuestionDocument,
    CreateQuestionMutation,
    FetchHealthPlanPackageWithQuestionsDocument,
    FetchHealthPlanPackageWithQuestionsQuery,
    HealthPlanPackage,
} from '../../gen/gqlClient'
import { IndexQuestionsPayload } from '../../gen/gqlClient'
import { mockSubmittedHealthPlanPackage, mockQuestionsPayload } from './'

type fetchStateHealthPlanPackageWithQuestionsProps = {
    stateSubmission?: HealthPlanPackage | Partial<HealthPlanPackage>
    id: string
    questions?: IndexQuestionsPayload
}

const fetchStateHealthPlanPackageWithQuestionsMockSuccess = ({
    stateSubmission = mockSubmittedHealthPlanPackage(),
    id,
    questions,
}: fetchStateHealthPlanPackageWithQuestionsProps): MockedResponse<
    Record<string, unknown>
> => {
    const questionPayload = questions || mockQuestionsPayload(id)
    const pkg = {
        ...stateSubmission,
        questions: questionPayload,
    }

    // override the ID of the returned draft to match the queried id.
    const mergedStateSubmission = Object.assign({}, pkg, { id })

    return {
        request: {
            query: FetchHealthPlanPackageWithQuestionsDocument,
            variables: { input: { pkgID: id } },
        },
        result: {
            data: {
                fetchHealthPlanPackage: {
                    pkg: mergedStateSubmission,
                },
            },
        },
    }
}

const fetchStateHealthPlanPackageWithQuestionsMockNotFound = ({
    id,
}: fetchStateHealthPlanPackageWithQuestionsProps): MockedResponse<FetchHealthPlanPackageWithQuestionsQuery> => {
    return {
        request: {
            query: FetchHealthPlanPackageWithQuestionsDocument,
            variables: { input: { pkgID: id } },
        },
        result: {
            data: {
                fetchHealthPlanPackage: {
                    pkg: undefined,
                },
            },
        },
    }
}

const createQuestionNetworkFailure =
    (): MockedResponse<CreateQuestionMutation> => {
        return {
            request: { query: CreateQuestionDocument },
            error: new Error('A network error occurred'),
        }
    }

export {
    createQuestionNetworkFailure,
    fetchStateHealthPlanPackageWithQuestionsMockSuccess,
    fetchStateHealthPlanPackageWithQuestionsMockNotFound,
}
