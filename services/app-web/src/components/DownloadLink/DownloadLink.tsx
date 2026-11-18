import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentProps, MouseEvent } from 'react'
import { downloadLinkNeedsRenewal } from '../../helpers/downloadLinkExpiry'
import { useS3 } from '../../contexts/S3Context'
import type { BucketShortName } from '../../s3'

type DownloadLinkProps = Omit<
    ComponentProps<'a'>,
    'href' | 'onClick' | 'onAuxClick'
> & {
    href: string
    // Fetch a fresh URL through the caller's document/package authorization path.
    renew: () => Promise<string>
    // Stable object identity: the signed href can change without changing the file.
    resourceKey?: string
}

type Renewal = {
    source: string
    tab: Window
    // Stop this UI operation even if its network request cannot be aborted.
    cancel: () => void
}

/**
 * Keep normal link navigation while the URL is valid. On expiry, open a blank
 * tab during the click, request a fresh URL, then navigate that tab to the file.
 * Resource changes and unmount cancel renewal; failures close the blank tab.
 * Use a plain anchor so presigned credentials do not enter link analytics.
 */
export function DownloadLink({
    href,
    renew,
    resourceKey,
    children,
    ...props
}: DownloadLinkProps) {
    // Track the file separately from its temporary URL. In particular, ZIP
    // refetches update the parent's href while this same download is in flight.
    const source = resourceKey ?? href
    const [renewed, setRenewed] = useState<{
        source: string
        href: string
        url: string
    }>()
    const [failedSource, setFailedSource] = useState<string>()
    const pending = useRef<Renewal | undefined>(undefined)
    const errorId = useId()
    const error = failedSource === source
    // A new href from the parent takes precedence over our earlier local renewal.
    const url =
        renewed?.source === source && renewed.href === href ? renewed.url : href

    // A parent-query refresh can replace the URL for the same package during
    // renewal. Only a different resource (or unmount) cancels its operation.
    // Layout cleanup runs before the replacement link becomes interactive.
    useLayoutEffect(() => {
        return () => {
            const operation = pending.current
            if (operation?.source === source) {
                pending.current = undefined
                operation.cancel()
                operation.tab.close()
            }
        }
    }, [source])

    const activate = (event: MouseEvent<HTMLAnchorElement>) => {
        if (event.button !== 0 && event.button !== 1) return
        // Leave valid links to the browser, including modifier-key navigation.
        if (!downloadLinkNeedsRenewal(url)) return
        event.preventDefault()
        // Repeated activation of one file must not open several blank tabs.
        if (pending.current?.source === source) return
        if (pending.current) {
            const previous = pending.current
            pending.current = undefined
            previous.cancel()
            previous.tab.close()
        }
        setFailedSource(undefined)
        // Opening after await can trigger popup blocking. Open during the user
        // gesture, then remove opener access before loading the external URL.
        const tab = window.open('about:blank', '_blank')
        if (!tab) {
            setFailedSource(source)
            return
        }
        tab.opener = null
        let cancel!: () => void
        const cancelled = new Promise<never>((_resolve, reject) => {
            cancel = () => reject(new Error('Download cancelled'))
        })
        const operation = { source, tab, cancel }
        pending.current = operation
        void (async () => {
            let timeout: ReturnType<typeof setTimeout> | undefined
            try {
                // Race the request against cancellation and a deadline so a
                // stalled request cannot leave the user in a blank tab forever.
                const fresh = await Promise.race([
                    cancelled,
                    new Promise<never>((_resolve, reject) => {
                        timeout = setTimeout(
                            () => reject(new Error('Download unavailable')),
                            30_000
                        )
                    }),
                    renew(),
                ])
                // An older response must not navigate a tab or update state
                // belonging to a replacement document's renewal.
                if (pending.current !== operation) return
                if (!fresh || downloadLinkNeedsRenewal(fresh))
                    throw new Error('Download unavailable')
                setRenewed({ source, href, url: fresh })
                tab.location.replace(fresh)
            } catch {
                if (pending.current === operation) {
                    tab.close()
                    setFailedSource(source)
                }
            } finally {
                clearTimeout(timeout)
                if (pending.current === operation) pending.current = undefined
            }
        })()
    }

    return (
        <>
            <a
                {...props}
                className={['usa-link', props.className]
                    .filter(Boolean)
                    .join(' ')}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={activate}
                onAuxClick={activate}
                aria-describedby={error ? errorId : props['aria-describedby']}
            >
                {children}
            </a>
            {error && (
                <span id={errorId} role="alert">
                    Download unavailable. Please try again.
                </span>
            )}
        </>
    )
}

/** Ordinary documents renew by key/bucket; ZIPs supply their own parent-query renewer. */
export function DocumentDownloadLink({
    s3URL,
    bucket,
    ...props
}: Omit<DownloadLinkProps, 'renew'> & {
    s3URL: string
    bucket: BucketShortName
}) {
    const { getURL, getKey } = useS3()
    return (
        <DownloadLink
            {...props}
            resourceKey={`${bucket}:${s3URL}`}
            renew={async () => {
                const key = getKey(s3URL)
                if (!key) throw new Error('Download unavailable')
                return getURL(key, bucket)
            }}
        />
    )
}
