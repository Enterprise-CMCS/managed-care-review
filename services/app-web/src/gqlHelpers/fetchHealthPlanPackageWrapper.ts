import { QueryResult } from '@apollo/client'
import {
    useFetchHealthPlanPackageQuery,
    FetchHealthPlanPackageQuery,
    FetchHealthPlanPackageQueryVariables,
} from '../gen/gqlClient'
import { HealthPlanFormDataType } from '../common-code/healthPlanFormDataType'
import { base64ToDomain } from '../common-code/proto/healthPlanFormDataProto'
import { recordJSException } from '../otelHelpers'
import {
    wrapApolloResult,
    QueryError,
    QueryLoading,
    QuerySuccess,
} from './apolloQueryWrapper'
import { DocumentDateLookupTable } from '../pages/SubmissionSummary/SubmissionSummary'
import { makeDateTableFromFormData } from '../documentHelpers/makeDocumentDateLookupTable'
import {
    LookupListType,
    makeDocumentListFromFormDatas,
} from '../documentHelpers/makeDocumentKeyLookupList'

// We return a slightly modified version of the wrapped result adding formDatas
type ParsedDataType = {
    formDatas: { [revisionID: string]: HealthPlanFormDataType }
    documentDates: DocumentDateLookupTable
    documentLists: LookupListType
}

type ParsedFetchSuccessType = QuerySuccess<FetchHealthPlanPackageQuery> &
    ParsedDataType

type ParsedFetchResultType = QueryLoading | QueryError | ParsedFetchSuccessType

type WrappedFetchResultType<ResultType> = Omit<
    ResultType,
    'data' | 'loading' | 'error'
> & {
    result: ParsedFetchResultType
}

function parseProtos(
    result: QuerySuccess<FetchHealthPlanPackageQuery>
): ParsedFetchResultType {
    const pkg = result.data.fetchHealthPlanPackage.pkg

    if (!pkg) {
        return {
            ...result,
            formDatas: {},
            documentDates: {},
            documentLists: {
                currentDocuments: [],
                previousDocuments: [],
            },
        }
    }

    if (pkg.revisions.length < 1) {
        const err = new Error(
            `useFetchHealthPlanPackageWrapper: submission has no revisions. ID: ${pkg.id}`
        )
        recordJSException(err)
        console.error(err)
        return {
            status: 'ERROR',
            error: err,
        }
    }

    const formDatas: { [revisionID: string]: HealthPlanFormDataType } = {}
    for (const revisionEdge of pkg.revisions) {
        const revision = revisionEdge.node
        const formDataResult = base64ToDomain(revision.formDataProto)

        if (formDataResult instanceof Error) {
            const err =
                new Error(`useFetchHealthPlanPackageWrapper: proto decoding error. ID:
                ${pkg.id}. Error message: ${formDataResult}`)
            recordJSException(err)
            console.error('Error decoding revision', revision, err)
            return {
                status: 'ERROR',
                error: formDataResult,
            }
        }

        formDatas[revision.id] = formDataResult
    }

    const formDatasInOrder = pkg.revisions.map((rEdge) => {
        return formDatas[rEdge.node.id]
    })
    const documentDates = makeDateTableFromFormData(formDatasInOrder)
    const documentLists = makeDocumentListFromFormDatas(formDatasInOrder)

    return {
        ...result,
        formDatas,
        documentDates,
        documentLists,
    }
}

// This wraps our call to useFetchHealthPlanPackageQuery, parsing out the protobuf
// from the response, returning extra errors in the case that parsing goes wrong
function useFetchHealthPlanPackageWrapper(
    id: string
): WrappedFetchResultType<
    QueryResult<
        FetchHealthPlanPackageQuery,
        FetchHealthPlanPackageQueryVariables
    >
> {
    const results = wrapApolloResult(
        useFetchHealthPlanPackageQuery({
            variables: {
                input: {
                    pkgID: id,
                },
            },
        })
    )
    const result = results.result

    if (result.status === 'SUCCESS') {
        const parsedResult = parseProtos(result)

        return {
            ...results,
            result: parsedResult,
        }
    }

    // Typescript should be smart enough to figure this out but I'll give it a pass
    const nonSuccessResult: QueryLoading | QueryError = result

    return {
        ...results,
        result: nonSuccessResult,
    }
}

export { useFetchHealthPlanPackageWrapper }
