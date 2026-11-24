import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DownloadLink, DocumentDownloadLink } from './DownloadLink'

const { getURL, getKey } = vi.hoisted(() => ({
    getURL: vi.fn(),
    getKey: vi.fn(),
}))
vi.mock('../../contexts/S3Context', () => ({
    useS3: () => ({ getURL, getKey }),
}))

const expired =
    'https://example.com/doc?X-Amz-Date=20200101T000000Z&X-Amz-Expires=900&X-Amz-Signature=secret'
const valid =
    'https://example.com/doc?X-Amz-Date=20990101T000000Z&X-Amz-Expires=900&X-Amz-Signature=secret'

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (error: Error) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

describe('DownloadLink', () => {
    const replace = vi.fn()
    const close = vi.fn()
    const tab = { opener: {}, location: { replace }, close }
    beforeEach(() => {
        vi.clearAllMocks()
        tab.opener = {}
        vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
        getKey.mockReturnValue('document-key')
        getURL.mockResolvedValue(valid)
    })
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('keeps a valid presigned URL as an ordinary secure anchor without renewal', () => {
        const renew = vi.fn()
        render(
            <DownloadLink href={valid} renew={renew}>
                Document
            </DownloadLink>
        )
        const anchor = screen.getByRole('link')
        expect(anchor).toHaveAttribute('href', valid)
        expect(anchor).toHaveAttribute('rel', 'noopener noreferrer')
        fireEvent.click(anchor)
        expect(renew).not.toHaveBeenCalled()
        expect(window.open).not.toHaveBeenCalled()
    })

    it.each(['HEALTH_PLAN_DOCS', 'QUESTION_ANSWER_DOCS'] as const)(
        'renews expired documents with the %s bucket and parsed legacy key',
        async (bucket) => {
            render(
                <DocumentDownloadLink
                    href={expired}
                    s3URL="s3://legacy/document"
                    bucket={bucket}
                >
                    Document
                </DocumentDownloadLink>
            )
            fireEvent.click(screen.getByRole('link'))
            expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
            expect(tab.opener).toBeNull()
            await waitFor(() => expect(replace).toHaveBeenCalledWith(valid))
            expect(getKey).toHaveBeenCalledWith('s3://legacy/document')
            expect(getURL).toHaveBeenCalledWith('document-key', bucket)
            expect(screen.getByRole('link')).toHaveAttribute('href', valid)
        }
    )

    it.each(['HEALTH_PLAN_DOCS', 'QUESTION_ANSWER_DOCS'] as const)(
        'prefers the canonical key over conflicting legacy metadata in %s',
        async (bucket) => {
            render(
                <DocumentDownloadLink
                    href={expired}
                    s3Key="allusers/canonical.pdf"
                    s3URL="s3://bucket/legacy.pdf/report.pdf"
                    bucket={bucket}
                >
                    Document
                </DocumentDownloadLink>
            )
            fireEvent.click(screen.getByRole('link'))
            await waitFor(() => expect(replace).toHaveBeenCalledWith(valid))
            expect(getURL).toHaveBeenCalledWith(
                'allusers/canonical.pdf',
                bucket
            )
            expect(getKey).not.toHaveBeenCalled()
            expect(screen.getByRole('link')).not.toHaveAttribute('s3key')
        }
    )

    it.each([undefined, null, ''])(
        'renews a canonical object when the legacy reference is %s',
        async (s3URL) => {
            render(
                <DocumentDownloadLink
                    href={expired}
                    s3Key="allusers/canonical.pdf"
                    s3URL={s3URL}
                    bucket="HEALTH_PLAN_DOCS"
                >
                    Document
                </DocumentDownloadLink>
            )
            fireEvent.click(screen.getByRole('link'))
            await waitFor(() => expect(replace).toHaveBeenCalledWith(valid))
            expect(getURL).toHaveBeenCalledWith(
                'allusers/canonical.pdf',
                'HEALTH_PLAN_DOCS'
            )
            expect(getKey).not.toHaveBeenCalled()
        }
    )

    it.each([null, ''])(
        'uses legacy metadata when the canonical key is %s',
        async (s3Key) => {
            render(
                <DocumentDownloadLink
                    href={expired}
                    s3Key={s3Key}
                    s3URL="s3://legacy/document"
                    bucket="HEALTH_PLAN_DOCS"
                >
                    Document
                </DocumentDownloadLink>
            )
            fireEvent.click(screen.getByRole('link'))
            await waitFor(() => expect(replace).toHaveBeenCalledWith(valid))
            expect(getURL).toHaveBeenCalledWith(
                'document-key',
                'HEALTH_PLAN_DOCS'
            )
        }
    )

    it('fails safely when neither a canonical key nor legacy reference exists', async () => {
        render(
            <DocumentDownloadLink href={expired} bucket="HEALTH_PLAN_DOCS">
                Document
            </DocumentDownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        expect(await screen.findByRole('alert')).toBeInTheDocument()
        expect(getURL).not.toHaveBeenCalled()
        expect(close).toHaveBeenCalled()
    })

    it('does not fall back to a different legacy object when canonical renewal fails', async () => {
        getURL.mockRejectedValue(new Error('Download unavailable'))
        render(
            <DocumentDownloadLink
                href={expired}
                s3Key="allusers/canonical.pdf"
                s3URL="s3://bucket/legacy.pdf/report.pdf"
                bucket="HEALTH_PLAN_DOCS"
            >
                Document
            </DocumentDownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        expect(await screen.findByRole('alert')).toBeInTheDocument()
        expect(getURL).toHaveBeenCalledTimes(1)
        expect(getKey).not.toHaveBeenCalled()
        expect(close).toHaveBeenCalled()
    })

    it('handles middle-click renewal', async () => {
        const renew = vi.fn().mockResolvedValue(valid)
        render(
            <DownloadLink href={expired} renew={renew}>
                Document
            </DownloadLink>
        )
        fireEvent(
            screen.getByRole('link'),
            new MouseEvent('auxclick', { bubbles: true, button: 1 })
        )
        await waitFor(() => expect(replace).toHaveBeenCalledWith(valid))
    })

    it('closes the blank tab and announces refresh failures without logging secrets', async () => {
        const log = vi.spyOn(console, 'error')
        render(
            <DownloadLink
                href={expired}
                renew={async () => {
                    throw new Error(expired)
                }}
            >
                Document
            </DownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Download unavailable. Please try again.'
        )
        expect(close).toHaveBeenCalled()
        expect(log).not.toHaveBeenCalled()
        expect(screen.getByRole('link')).toHaveAttribute(
            'aria-describedby',
            screen.getByRole('alert').id
        )
    })

    it('closes the blank tab if URL renewal never finishes', async () => {
        vi.useFakeTimers()
        render(
            <DownloadLink href={expired} renew={() => new Promise(() => {})}>
                Document
            </DownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        await act(async () => {
            await vi.advanceTimersByTimeAsync(30_000)
        })
        expect(close).toHaveBeenCalled()
        expect(replace).not.toHaveBeenCalled()
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Download unavailable'
        )
        expect(vi.getTimerCount()).toBe(0)
    })

    it('allows a different document to renew while the old response is pending', async () => {
        getKey.mockImplementation((url: string) =>
            url.includes('first.pdf') ? 'first.pdf' : 'second.pdf'
        )
        const first = deferred<string>()
        const secondTab = {
            opener: {},
            location: { replace: vi.fn() },
            close: vi.fn(),
        }
        vi.mocked(window.open)
            .mockReturnValueOnce(tab as unknown as Window)
            .mockReturnValueOnce(secondTab as unknown as Window)
        getURL.mockReturnValueOnce(first.promise).mockResolvedValueOnce(valid)
        const { rerender } = render(
            <DocumentDownloadLink
                href={expired}
                s3URL="s3://bucket/first.pdf/first.pdf"
                bucket="HEALTH_PLAN_DOCS"
            >
                Document
            </DocumentDownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        rerender(
            <DocumentDownloadLink
                href={expired}
                s3URL="s3://bucket/second.pdf/second.pdf"
                bucket="HEALTH_PLAN_DOCS"
            >
                Document
            </DocumentDownloadLink>
        )
        expect(close).toHaveBeenCalled()
        fireEvent.click(screen.getByRole('link'))
        await waitFor(() =>
            expect(secondTab.location.replace).toHaveBeenCalledWith(valid)
        )
        await act(async () => {
            first.resolve(`${valid}&old=true`)
        })
        expect(getURL).toHaveBeenCalledTimes(2)
        expect(replace).not.toHaveBeenCalled()
        expect(screen.getByRole('link')).toHaveAttribute('href', valid)
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it.each([
        ['canonical-key change', 'allusers/second.pdf', 'HEALTH_PLAN_DOCS'],
        ['bucket change', 'allusers/first.pdf', 'QUESTION_ANSWER_DOCS'],
    ] as const)(
        'cancels stale renewal after a %s even when legacy metadata is unchanged',
        async (_change, s3Key, bucket) => {
            const first = deferred<string>()
            const secondTab = {
                opener: null,
                location: { replace: vi.fn() },
                close: vi.fn(),
            }
            vi.mocked(window.open)
                .mockReturnValueOnce(tab as unknown as Window)
                .mockReturnValueOnce(secondTab as unknown as Window)
            getURL
                .mockReturnValueOnce(first.promise)
                .mockResolvedValueOnce(valid)
            const { rerender } = render(
                <DocumentDownloadLink
                    href={expired}
                    s3Key="allusers/first.pdf"
                    s3URL="s3://bucket/legacy.pdf/report.pdf"
                    bucket="HEALTH_PLAN_DOCS"
                >
                    Document
                </DocumentDownloadLink>
            )
            fireEvent.click(screen.getByRole('link'))
            rerender(
                <DocumentDownloadLink
                    href={expired}
                    s3Key={s3Key}
                    s3URL="s3://bucket/legacy.pdf/report.pdf"
                    bucket={bucket}
                >
                    Document
                </DocumentDownloadLink>
            )
            expect(close).toHaveBeenCalled()
            fireEvent.click(screen.getByRole('link'))
            await waitFor(() =>
                expect(secondTab.location.replace).toHaveBeenCalledWith(valid)
            )
            await act(async () => first.resolve(`${valid}&old=true`))
            expect(getURL).toHaveBeenLastCalledWith(s3Key, bucket)
            expect(replace).not.toHaveBeenCalled()
            expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        }
    )

    it('keeps the same canonical renewal active when legacy metadata changes', async () => {
        const first = deferred<string>()
        getURL.mockReturnValue(first.promise)
        const { rerender } = render(
            <DocumentDownloadLink
                href={expired}
                s3Key="allusers/canonical.pdf"
                s3URL="s3://bucket/old.pdf/report.pdf"
                bucket="HEALTH_PLAN_DOCS"
            >
                Document
            </DocumentDownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        rerender(
            <DocumentDownloadLink
                href={valid}
                s3Key="allusers/canonical.pdf"
                s3URL="s3://bucket/corrected.pdf/report.pdf"
                bucket="HEALTH_PLAN_DOCS"
            >
                Document
            </DocumentDownloadLink>
        )
        expect(close).not.toHaveBeenCalled()
        await act(async () => first.resolve(valid))
        expect(replace).toHaveBeenCalledWith(valid)
        expect(getURL).toHaveBeenCalledTimes(1)
    })

    it('does not show an old renewal failure against a different resource', async () => {
        const first = deferred<string>()
        const { rerender } = render(
            <DownloadLink
                resourceKey="first"
                href={expired}
                renew={() => first.promise}
            >
                Document
            </DownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        rerender(
            <DownloadLink
                resourceKey="second"
                href={expired}
                renew={async () => valid}
            >
                Document
            </DownloadLink>
        )
        await act(async () => {
            first.reject(new Error('Old request failed'))
        })
        expect(close).toHaveBeenCalled()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(replace).not.toHaveBeenCalled()
    })

    it('keeps renewal active when its parent query refreshes the same resource URL', async () => {
        const first = deferred<string>()
        const { rerender } = render(
            <DownloadLink
                resourceKey="same-package"
                href={expired}
                renew={() => first.promise}
            >
                Package
            </DownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        rerender(
            <DownloadLink
                resourceKey="same-package"
                href={valid}
                renew={() => first.promise}
            >
                Package
            </DownloadLink>
        )
        expect(close).not.toHaveBeenCalled()
        await act(async () => {
            first.resolve(valid)
        })
        expect(replace).toHaveBeenCalledWith(valid)
        expect(screen.getByRole('link')).toHaveAttribute('href', valid)
    })

    it('closes a pending renewal on unmount and ignores its late success', async () => {
        const first = deferred<string>()
        const { unmount } = render(
            <DownloadLink href={expired} renew={() => first.promise}>
                Document
            </DownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        unmount()
        expect(close).toHaveBeenCalled()
        await act(async () => {
            first.resolve(valid)
        })
        expect(replace).not.toHaveBeenCalled()
    })

    it('reports a blocked popup without requesting a renewal', () => {
        vi.mocked(window.open).mockReturnValue(null)
        const renew = vi.fn()
        render(
            <DownloadLink href={expired} renew={renew}>
                Document
            </DownloadLink>
        )
        fireEvent.click(screen.getByRole('link'))
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(renew).not.toHaveBeenCalled()
    })
})
