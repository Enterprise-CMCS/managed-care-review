type QueryLoading = {
    status: 'LOADING'
}

type QueryError = {
    status: 'ERROR'
    error: Error
}

type QuerySuccess<SuccessType> = {
    status: 'SUCCESS'
    data: SuccessType
}

type ApolloUseQueryResult<SuccessType> =
    | QueryLoading
    | QueryError
    | QuerySuccess<SuccessType>

// These are the parts of the useQuery result we want to wrap up, converting data | error | loading => result
interface WrappableApolloQuery {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
    error?: Error
    loading: boolean
}

type WrappedApolloResult<ResultType extends WrappableApolloQuery> = Omit<
    ResultType,
    'data' | 'loading' | 'error'
> & {
    result: ApolloUseQueryResult<NonNullable<ResultType['data']>>
}

// Apollo's useQuery returns three independent variables to track loading, error, and data. In our usage
// no two of those variables should never be accessed at the same time. This wrapper replaces them with
// a single variable "result" of ApolloUseQueryResult type.
function wrapApolloResult<ResultType extends WrappableApolloQuery>(
    queryResult: ResultType
): WrappedApolloResult<ResultType> {
    const { loading, error, data } = queryResult

    if (loading) {
        return {
            ...queryResult,
            result: {
                status: 'LOADING',
            },
        }
    }

    if (error) {
        return {
            ...queryResult,
            result: {
                status: 'ERROR',
                error: error,
            },
        }
    }

    if (data) {
        return {
            ...queryResult,
            result: {
                status: 'SUCCESS',
                data,
            },
        }
    }

    return {
        ...queryResult,
        result: {
            status: 'ERROR',
            error: new Error('UNEXPECTED APOLLO BEHAVIOR, NO DATA'),
        },
    }
}

export { wrapApolloResult }

export type { ApolloUseQueryResult, QueryError, QueryLoading, QuerySuccess }
