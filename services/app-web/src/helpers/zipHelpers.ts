import { DocumentZipPackage } from '../gen/gqlClient'

/**
 * Get the download URL for a specific document type from an array of zip packages
 */
export function getZipDownloadUrl(
    documentZipPackages: DocumentZipPackage[] | undefined,
    documentType: 'CONTRACT_DOCUMENTS' | 'RATE_DOCUMENTS'
): string | undefined {
    if (!documentZipPackages) return undefined

    const zipPackage = documentZipPackages.find(
        (pkg) => pkg.documentType === documentType
    )

    return zipPackage?.downloadUrl || undefined
}

/**
 * Get contract documents zip download URL
 */
export function getContractZipDownloadUrl(
    documentZipPackages: DocumentZipPackage[] | undefined
): string | undefined {
    return getZipDownloadUrl(documentZipPackages, 'CONTRACT_DOCUMENTS')
}

/**
 * Get rate documents zip download URL
 */
export function getRateZipDownloadUrl(
    documentZipPackages: DocumentZipPackage[] | undefined
): string | undefined {
    return getZipDownloadUrl(documentZipPackages, 'RATE_DOCUMENTS')
}
