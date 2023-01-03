import { ApolloError } from '@apollo/client'
import {
    useFetchHealthPlanPackageQuery,
    FetchHealthPlanPackageQuery,
} from '../gen/gqlClient'
import { HealthPlanFormDataType } from '../common-code/healthPlanFormDataType'
import { base64ToDomain } from '../common-code/proto/healthPlanFormDataProto'

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
    formDatas: { [id: string]: HealthPlanFormDataType }
}

type FetchHealthPlanPackageResult = FetchLoading | FetchError | FetchSuccess

function fetchHealthPlanPackageSucceeded(
    result: FetchHealthPlanPackageResult
): result is FetchSuccess {
    return result.status === 'SUCCESS'
}

// These apollo results are not actually supposed to be used simultaneously, so we can make a result type that only returns the correct one
function wrapApolloResult({
    loading,
    error,
    data,
}: {
    loading: boolean
    error: ApolloError | undefined
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
            formDatas: {},
        }
    }

    return {
        status: 'ERROR',
        error: new Error('UNEXPECTED APOLLO BEHAVIOR, NO DATA'),
    }
}

function useFetchHealthPlanPackageWrapper(
    id: string
): FetchHealthPlanPackageResult {
    const { loading, error, data } = useFetchHealthPlanPackageQuery({
        variables: {
            input: {
                pkgID: id,
            },
        },
    })

    const result = wrapApolloResult({ loading, error, data })

    if (result.status === 'SUCCESS') {
        // Ok, even in here, we want to start using that wrapped result, add to it.
        const pkg = result.data.fetchHealthPlanPackage.pkg
        if (pkg) {
            const formDatas: { [id: string]: HealthPlanFormDataType } = {}

            for (const revisionNode of pkg.revisions) {
                const revision = revisionNode.node
                const formDataResult = base64ToDomain(revision.formDataProto)

                if (formDataResult instanceof Error) {
                    console.error('Error decoding revision', revision)
                    return {
                        status: 'ERROR',
                        error: formDataResult,
                    }
                }

                formDatas[revision.id] = formDataResult
            }
            return {
                status: 'SUCCESS',
                data: result.data,
                formDatas: formDatas,
            }
        }
    }

    return result
}

export { useFetchHealthPlanPackageWrapper, fetchHealthPlanPackageSucceeded }
