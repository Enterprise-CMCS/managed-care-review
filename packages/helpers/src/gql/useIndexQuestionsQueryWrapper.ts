import { wrapApolloResult, WrappedApolloResultType } from './apolloQueryWrapper'
import { useIndexQuestionsQuery } from '../gen/gqlClient'

type WrappedFetchResultType = WrappedApolloResultType<
    ReturnType<typeof useIndexQuestionsQuery>
>

function useIndexQuestionsQueryWrapper(id: string): WrappedFetchResultType {
    const results = wrapApolloResult(
        useIndexQuestionsQuery({
            variables: {
                input: {
                    contractID: id,
                },
            },
        })
    )

    const result = results.result

    return {
        ...results,
        result: result,
    }
}

export { useIndexQuestionsQueryWrapper }
