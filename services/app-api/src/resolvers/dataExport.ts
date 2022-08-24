import { QueryResolvers } from '../gen/gqlServer'
import { Store } from '../postgres'

export function dataExportResolver(store: Store): QueryResolvers['dataExport'] {
    return async (_parent, context) => {
        const stateCode = await store.dataExport('AZ')
        console.log('JJ Result: ', stateCode)
        if (stateCode === undefined) {
            return {
                name: undefined,
            }
        }
        return stateCode
    }
}
