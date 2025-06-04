import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'

export function fetchOauthClientsResolver(
    store: Store
): QueryResolvers['fetchOauthClients'] {
    return async (_parent, { input }, context) => {
        const { user } = context
        if (!user || user.role !== 'ADMIN_USER') {
            throw new Error(
                'Forbidden: Only ADMIN users can fetch OAuth clients'
            )
        }
        let oauthClients = []
        if (!input || !input.clientIds || input.clientIds.length === 0) {
            // Fetch all
            const all = await store.listOAuthClients()
            if (all instanceof Error) throw all
            oauthClients = all
        } else {
            // Fetch by clientIds
            for (const clientId of input.clientIds) {
                const client = await store.getOAuthClientByClientId(clientId)
                if (client instanceof Error) throw client
                if (client) oauthClients.push(client)
            }
            // Remove duplicates by id
            const seen = new Set()
            oauthClients = oauthClients.filter((c) => {
                if (seen.has(c.id)) return false
                seen.add(c.id)
                return true
            })
        }
        return {
            edges: oauthClients.map((c) => ({ node: c })),
            totalCount: oauthClients.length,
        }
    }
}
