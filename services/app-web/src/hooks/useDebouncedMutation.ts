import {
    ApolloCache,
    DefaultContext,
    DocumentNode,
    MutationFunctionOptions,
    MutationHookOptions,
    MutationTuple,
    TypedDocumentNode,
    useMutation,
} from '@apollo/client'

import { debounce } from '@managed-care-review/common-code/debounce'

/* mostly from https://stackoverflow.com/a/74109414/5351022
given potential multi-clicks as well as the possibility that mutations might
be fired off multiple times programmatically, wrapping a mutation with this hook
will debounce it and prevent multiple overlapping updates. */
export const useDebouncedMutation = <
    TData,
    TVariables,
    TCache extends ApolloCache<unknown> = ApolloCache<unknown>
>(
    GQL: DocumentNode | TypedDocumentNode<TData, TVariables>,
    options?: MutationHookOptions<TData, TVariables, DefaultContext>,
    delay?: number
): MutationTuple<TData, TVariables, DefaultContext, TCache> => {
    const debounceMutation = debounce((mutation, options) => {
        const controller = new AbortController()

        return mutation({
            ...options,
            context: {
                fetchOptions: {
                    signal: controller.signal,
                },
            },
        })
    }, delay || 200)

    const [mutation, rest] = useMutation<TData, TVariables>(GQL, options)

    return [
        (options) => {
            return new Promise((resolve, reject) => {
                void debounceMutation(
                    (
                        opts:
                            | MutationFunctionOptions<
                                  TData,
                                  TVariables,
                                  DefaultContext,
                                  ApolloCache<unknown>
                              >
                            | undefined
                    ) => {
                        mutation(opts).then(resolve).catch(reject)
                    },
                    options
                )
            })
        },
        rest,
    ]
}
