import {
    useFetchHealthPlanPackageQuery,
    FetchHealthPlanPackageQuery,
    useFetchHealthPlanPackageWithQuestionsQuery,
    HealthPlanRevision,
    HealthPlanPackage,
} from '../gen/gqlClient'
import { HealthPlanFormDataType } from '../common-code/healthPlanFormDataType'
import { base64ToDomain } from '../common-code/proto/healthPlanFormDataProto'
import {
    wrapApolloResult,
    ApolloResultType,
    QuerySuccessType,
    WrappedApolloResultType,
} from './apolloQueryWrapper'
import { QueryFunctionOptions, QueryHookOptions } from '@apollo/client'
import { recordJSException } from '../otelHelpers'
import {
    DocumentDateLookupTableType,
    makeDocumentDateTable,
} from '../documentHelpers/makeDocumentDateLookupTable'

// ExpandedRevisionsType - HPP revision plus an additional formData field containing values of formDataProto decoded into typescript
type ExpandedRevisionsType = HealthPlanRevision & {
    formData: HealthPlanFormDataType
}

type RevisionsLookupType = { [revisionID: string]: ExpandedRevisionsType }
// We return a slightly modified version of the wrapped result adding RevisionsLookup, documentDateLookup, etc
// all of these fields will be added to the SUCCESS type
type AdditionalParsedDataType = {
    revisionsLookup: RevisionsLookupType
    documentDates: DocumentDateLookupTableType
}

type ParsedFetchResultType = ApolloResultType<
    FetchHealthPlanPackageQuery,
    AdditionalParsedDataType
>

type WrappedFetchResultType = WrappedApolloResultType<
    ReturnType<typeof useFetchHealthPlanPackageQuery>,
    AdditionalParsedDataType
>

type WrappedFetchResultWithQuestionsType = WrappedApolloResultType<
    ReturnType<typeof useFetchHealthPlanPackageWithQuestionsQuery>,
    AdditionalParsedDataType
>

// Take health plan package directly from API, decodes all fields and return expanded revisions list.
const buildRevisionsLookup = (
    pkg: HealthPlanPackage
): RevisionsLookupType | Error => {
    const expandedRevisions: RevisionsLookupType = {}
    for (const revision of pkg.revisions) {
        const revisionDecodedFormData = base64ToDomain(
            revision.node.formDataProto
        )

        if (revisionDecodedFormData instanceof Error) {
            const err =
                new Error(`buildRevisionsLookup: proto decoding error. pkg ID: ${pkg.id} revision ID:
            ${revision.node.id}. Error message: ${revisionDecodedFormData}`)
            recordJSException(err)
            return err
        } else {
            expandedRevisions[revision.node.id] = {
                ...revision.node,
                formData: revisionDecodedFormData,
            }
        }
    }

    return expandedRevisions
}

function parseProtos(
    result: QuerySuccessType<FetchHealthPlanPackageQuery>
): ParsedFetchResultType {
    const pkg = result.data.fetchHealthPlanPackage.pkg

    if (!pkg) {
        return {
            ...result,
            revisionsLookup: {},
            documentDates: { previousSubmissionDate: null },
        }
    }

    if (pkg.revisions.length < 1) {
        const err = new Error(
            `useFetchHealthPlanPackageWrapper: submission has no revisions. ID: ${pkg.id}`
        )
        console.error(err)
        return {
            status: 'ERROR',
            error: err,
        }
    }

    const revisionsLookup = buildRevisionsLookup(pkg)
    if (revisionsLookup instanceof Error) {
        return {
            status: 'ERROR',
            error: revisionsLookup,
        }
    } else {
        const documentDates = makeDocumentDateTable(revisionsLookup)

        return {
            ...result,
            revisionsLookup,
            documentDates,
        }
    }
}

// This wraps our call to useFetchHealthPlanPackageQuery, parsing out the protobuf
// from the response, returning extra errors in the case that parsing goes wrong
function useFetchHealthPlanPackageWrapper(id: string, skip?: boolean): WrappedFetchResultType {
    const results = wrapApolloResult(
        useFetchHealthPlanPackageQuery({
            variables: {
                input: {
                    pkgID: id,
                },
            },
            skip: skip ?? false
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

    return {
        ...results,
        result: result,
    }
}

function useFetchHealthPlanPackageWithQuestionsWrapper(
    id: string,
    onCompleted?: QueryFunctionOptions['onCompleted']
): WrappedFetchResultWithQuestionsType {
    const results = wrapApolloResult(
        useFetchHealthPlanPackageWithQuestionsQuery({
            variables: {
                input: {
                    pkgID: id,
                },
            },
            onCompleted,
            fetchPolicy: 'network-only',
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

    return {
        ...results,
        result: result,
    }
}

export {
    useFetchHealthPlanPackageWrapper,
    useFetchHealthPlanPackageWithQuestionsWrapper,
    buildRevisionsLookup,
}

export type { ExpandedRevisionsType, RevisionsLookupType }
