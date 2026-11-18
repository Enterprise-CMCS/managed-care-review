/**
 * Renew presigned links with a minute of headroom for navigation and the S3 GET.
 * Links without recognized AWS signing parameters keep native navigation.
 */
export function downloadLinkNeedsRenewal(
    url: string,
    now = Date.now()
): boolean {
    try {
        const params = new URL(url).searchParams
        // Signature V4 stores the signing time and a relative lifetime.
        if (params.has('X-Amz-Signature')) {
            const date = params.get('X-Amz-Date') ?? ''
            const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(
                date
            )
            const seconds = Number(params.get('X-Amz-Expires'))
            if (!match || !Number.isFinite(seconds) || seconds <= 0) return true
            const [, year, month, day, hour, minute, second] = match
            const signedAt = Date.UTC(
                +year,
                +month - 1,
                +day,
                +hour,
                +minute,
                +second
            )
            return signedAt + seconds * 1000 <= now + 60_000
        }
        // Older Signature V2 links instead carry an absolute Unix expiry time.
        if (params.has('Signature') && params.has('AWSAccessKeyId')) {
            const expires = Number(params.get('Expires'))
            return !Number.isFinite(expires) || expires * 1000 <= now + 60_000
        }
        return false
    } catch {
        return false
    }
}
