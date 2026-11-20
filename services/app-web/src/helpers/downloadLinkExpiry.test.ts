import { downloadLinkNeedsRenewal } from './downloadLinkExpiry'

describe('downloadLinkNeedsRenewal', () => {
    const now = Date.UTC(2026, 0, 1)
    it('renews expired and nearly expired SigV4 URLs', () => {
        const url =
            'https://example.com/?X-Amz-Signature=secret&X-Amz-Date=20260101T000000Z&X-Amz-Expires='
        expect(downloadLinkNeedsRenewal(url + '30', now)).toBe(true)
        expect(downloadLinkNeedsRenewal(url + '60', now)).toBe(true)
        expect(downloadLinkNeedsRenewal(url + '900', now)).toBe(false)
        expect(downloadLinkNeedsRenewal(url + 'invalid', now)).toBe(true)
    })
    it('supports legacy signed URLs', () => {
        expect(
            downloadLinkNeedsRenewal(
                'https://example.com/?Signature=secret&AWSAccessKeyId=key&Expires=1',
                now
            )
        ).toBe(true)
    })
    it('does not rewrite ordinary and local URLs', () => {
        for (const url of [
            '/local/document',
            'https://example.com/doc',
            'https://example.com/?Expires=1',
        ]) {
            expect(downloadLinkNeedsRenewal(url, now)).toBe(false)
        }
    })
})
