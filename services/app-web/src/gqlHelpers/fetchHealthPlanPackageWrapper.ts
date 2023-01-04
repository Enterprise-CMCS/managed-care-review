import { ApolloError } from '@apollo/client'
import {
    useFetchHealthPlanPackageQuery,
    FetchHealthPlanPackageQuery,
    HealthPlanRevision,
    HealthPlanRevisionEdge,
    HealthPlanPackage,
} from '../gen/gqlClient'
import { HealthPlanFormDataType } from '../common-code/healthPlanFormDataType'
import { base64ToDomain } from '../common-code/proto/healthPlanFormDataProto'
import { recordJSException } from '../otelHelpers'

type FetchLoading = {
    status: 'LOADING'
}

type FetchError = {
    status: 'ERROR'
    error: Error
}

type FetchSuccess = {
    status: 'SUCCESS'
    data: FetchHealthPlanPackageQuery
}

type FetchHealthPlanPackageResult = FetchLoading | FetchError | FetchSuccess

// These apollo results are not actually supposed to be used simultaneously, so we can make a result type that only returns the correct one
function wrapApolloResult({
    loading,
    error,
    data,
}: {
    loading: boolean
    error?: ApolloError
    data: FetchHealthPlanPackageQuery | undefined
}): FetchHealthPlanPackageResult {
    if (loading) {
        return {
            status: 'LOADING',
        }
    }

    if (error) {
        return {
            status: 'ERROR',
            error: error,
        }
    }

    if (data) {
        return {
            status: 'SUCCESS',
            data,
        }
    }

    return {
        status: 'ERROR',
        error: new Error('UNEXPECTED APOLLO BEHAVIOR, NO DATA'),
    }
}

// This is ugly, but incredibly useful.
// We want to hide our protobuf parsing from our pages. The GQL
// query returns, several layers down, HealthPlanRevisions which have
// a formDataProto property on it holding the encoded proto string.
// We want our wrapper to return the identical query to graphql, but
// with all the HealthPlanRevisions having an additional `formData`
// property that contains the parsed HealthPlanFormDataType
// domain model.

// To start, we construct our ParsedHealthPlanRevision by extending
// that type with the `formData` property.
interface ParsedHealthPlanRevision extends HealthPlanRevision {
    formData: HealthPlanFormDataType
}

// Then, we recursively replace each property in the chain from there to the
// query with the existing type, removing the one containing type and replacing it
// with our parsed type.
// So, here, we take the HealthPlanRevisionEdge, remove `node` and extend it with
// our parsed `node`
interface ParsedHealthPlanRevisionEdge
    extends Omit<HealthPlanRevisionEdge, 'node'> {
    node: ParsedHealthPlanRevision
}
interface ParsedPackageType extends Omit<HealthPlanPackage, 'revisions'> {
    revisions: ParsedHealthPlanRevisionEdge[]
}
interface ParsedFetchHealthPlanPackageSubQuery
    extends Omit<FetchHealthPlanPackageQuery['fetchHealthPlanPackage'], 'pkg'> {
    pkg?: ParsedPackageType | null
}
interface ParsedFetchHealthPlanPackageQuery
    extends Omit<FetchHealthPlanPackageQuery, 'fetchHealthPlanPackage'> {
    fetchHealthPlanPackage: ParsedFetchHealthPlanPackageSubQuery
}

type ParsedFetchResult =
    | Exclude<FetchHealthPlanPackageResult, FetchSuccess>
    | {
          status: 'SUCCESS'
          data: ParsedFetchHealthPlanPackageQuery
      }

// This wraps our call to useFetchHealthPlanPackageQuery, parsing out the protobuf
// from the response, returning extra errors in the case that parsing goes wrong
function useFetchHealthPlanPackageWrapper(id: string): ParsedFetchResult {
    const result = wrapApolloResult(
        useFetchHealthPlanPackageQuery({
            variables: {
                input: {
                    pkgID: id,
                },
            },
        })
    )

    if (result.status === 'SUCCESS') {
        const pkg = result.data.fetchHealthPlanPackage.pkg

        let parsedPackage: ParsedPackageType | undefined = undefined
        if (pkg) {
            if (pkg.revisions.length < 1) {
                const err = new Error(
                    `useFetchHealthPlanPackageWrapper: submission has no revisions. ID: ${id}`
                )
                recordJSException(err)
                console.error(err)
                return {
                    status: 'ERROR',
                    error: err,
                }
            }

            const parsedEdges: ParsedHealthPlanRevisionEdge[] = []
            for (const revisionEdge of pkg.revisions) {
                const revision = revisionEdge.node
                const formDataResult = base64ToDomain(revision.formDataProto)

                if (formDataResult instanceof Error) {
                    const err =
                        new Error(`useFetchHealthPlanPackageWrapper: proto decoding error. ID:
		            ${id}. Error message: ${formDataResult}`)
                    recordJSException(err)
                    console.error('Error decoding revision', revision, err)
                    return {
                        status: 'ERROR',
                        error: formDataResult,
                    }
                }

                // construct a parsed edge, again, trying to preserve everything
                // that isn't the new formData on the revision
                const parsedEdge: ParsedHealthPlanRevisionEdge = {
                    ...revisionEdge,
                    node: {
                        ...revision,
                        formData: formDataResult,
                    },
                }

                parsedEdges.push(parsedEdge)
            }

            parsedPackage = {
                ...pkg,
                revisions: parsedEdges,
            }
        }

        const parsedQuery: ParsedFetchHealthPlanPackageQuery = {
            ...result.data,
            fetchHealthPlanPackage: {
                ...result.data.fetchHealthPlanPackage,
                pkg: parsedPackage,
            },
        }

        return {
            status: 'SUCCESS',
            data: parsedQuery,
        }
    }

    return result
}

export { useFetchHealthPlanPackageWrapper }
