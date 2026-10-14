import { render, screen } from '@testing-library/react'
import { S3Provider, useS3 } from './S3Context'
import type { S3ClientT } from '../s3'

const { variation, auth } = vi.hoisted(() => ({
    variation: vi.fn(),
    auth: {
        loggedInUser: { email: 'user@example.com' },
        featureFlagsStatus: 'READY' as 'PENDING' | 'READY' | 'ERROR',
    },
}))
vi.mock('./AuthContext', () => ({ useAuth: () => auth }))
beforeEach(() => {
    auth.featureFlagsStatus = 'READY'
})
vi.mock('launchdarkly-react-client-sdk', () => ({
    useLDClient: () => ({ variation }),
}))

const legacy = { getKey: () => 'legacy' } as unknown as S3ClientT
const api = { getKey: () => 'api' } as unknown as S3ClientT
function Probe() {
    return <span>{useS3().getKey('s3://bucket/key/name.pdf')}</span>
}

it.each([false, true])(
    'selects API storage only when enabled: %s',
    (enabled) => {
        variation.mockReturnValue(enabled)
        render(
            <S3Provider client={legacy} apiClient={api}>
                <Probe />
            </S3Provider>
        )
        expect(screen.getByText(enabled ? 'api' : 'legacy')).toBeInTheDocument()
    }
)

it('waits for authenticated targeting, then pins the transport until reload', () => {
    auth.featureFlagsStatus = 'PENDING'
    variation.mockReturnValue(false)
    const { rerender } = render(
        <S3Provider client={legacy} apiClient={api}>
            <Probe />
        </S3Provider>
    )
    expect(screen.queryByText('legacy')).not.toBeInTheDocument()
    auth.featureFlagsStatus = 'READY'
    variation.mockReturnValue(true)
    rerender(
        <S3Provider client={legacy} apiClient={api}>
            <Probe />
        </S3Provider>
    )
    expect(screen.getByText('api')).toBeInTheDocument()
    variation.mockReturnValue(false)
    rerender(
        <S3Provider client={legacy} apiClient={api}>
            <Probe />
        </S3Provider>
    )
    expect(screen.getByText('api')).toBeInTheDocument()
})

it('falls back when targeting fails and preserves clients without an API adapter', () => {
    auth.featureFlagsStatus = 'ERROR'
    variation.mockReturnValue(true)
    const { unmount } = render(
        <S3Provider client={legacy} apiClient={api}>
            <Probe />
        </S3Provider>
    )
    expect(screen.getByText('legacy')).toBeInTheDocument()
    unmount()
    variation.mockReturnValue(true)
    render(
        <S3Provider client={legacy}>
            <Probe />
        </S3Provider>
    )
    expect(screen.getByText('legacy')).toBeInTheDocument()
})
