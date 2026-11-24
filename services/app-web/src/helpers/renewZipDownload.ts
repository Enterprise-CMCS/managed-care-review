import type { ApolloClient } from '@apollo/client'

// Contract and rate queries nest ZIP packages differently. Match the package
// ID and ZIP-specific fields rather than assume one response shape.
function findZipPackage(
    data: unknown,
    id: string
): { downloadUrl: string } | undefined {
    if (!data || typeof data !== 'object') return undefined
    if (
        'id' in data &&
        data.id === id &&
        'downloadUrl' in data &&
        typeof data.downloadUrl === 'string' &&
        's3Key' in data
    ) {
        return { downloadUrl: data.downloadUrl }
    }
    for (const value of Object.values(data)) {
        const found = findZipPackage(value, id)
        if (found) return found
    }
    return undefined
}

/**
 * ZIPs renew through the authorized parent query that supplied the package.
 * The shared document-download API rejects ZIP keys, so it is not a fallback.
 */
export async function renewZipDownload(
    client: ApolloClient,
    packageId: string
): Promise<string> {
    // Refetch only a query containing this exact package, not every active
    // query or a different revision's ZIP. The server rechecks parent access.
    for (const query of client.getObservableQueries('active')) {
        if (!findZipPackage(query.getCurrentResult().data, packageId)) continue
        const result = await query.refetch()
        const refreshed = findZipPackage(result.data, packageId)
        if (refreshed?.downloadUrl) return refreshed.downloadUrl
        break
    }
    throw new Error('Download unavailable')
}
