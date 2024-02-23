import { ApolloError } from "@apollo/client"

type QueryLoadingType = {
    status: 'LOADING'
}

type QueryErrorType = {
    status: 'ERROR'
    error: Error
}

type QuerySuccessType<SuccessType, AdditionalVars = Record<string, unknown>> = {
    status: 'SUCCESS'
    data: SuccessType
} & AdditionalVars

type ApolloResultType<SuccessType, AdditionalVars = Record<string, unknown>> =
    | QueryLoadingType
    | QueryErrorType
    | QuerySuccessType<SuccessType, AdditionalVars>

// These are the parts of the useQuery result we want to wrap up, converting data | error | loading => result
interface WrappableApolloResultsType {
    data: unknown
    error?: Error
    loading: boolean
}

type WrappedApolloResultType<
    ResultType extends WrappableApolloResultsType,
    AdditionalVars = Record<string, unknown>
> = Omit<ResultType, 'data' | 'loading' | 'error'> & {
    result: ApolloResultType<NonNullable<ResultType['data']>, AdditionalVars>
}

// Apollo's useQuery returns three independent variables to track loading, error, and data. In our usage
// no two of those variables should never be accessed at the same time. This wrapper replaces them with
// a single variable "result" of ApolloResultType type.
function wrapApolloResult<ResultType extends WrappableApolloResultsType>(
    queryResult: ResultType
): WrappedApolloResultType<ResultType> {
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
    class SkipError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "SKIPPED";
        }
      }

    return {
        ...queryResult,
        result: {
            status: 'ERROR',
            error: new SkipError('Skipped query'),    //this happens when  uery is skipped, not unexpected behavior
        },
    }
}

export { wrapApolloResult }

export type {
    ApolloResultType,
    WrappedApolloResultType,
    QuerySuccessType,
    QueryErrorType,
    QueryLoadingType,
}
