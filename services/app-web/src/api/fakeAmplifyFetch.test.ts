import { API } from 'aws-amplify'
import { fakeAmplifyFetch } from './fakeAmplifyFetch'

vi.mock('aws-amplify', () => ({ API: { post: vi.fn(), cancel: vi.fn() } }))
afterEach(() => vi.clearAllMocks())

it('preserves the authenticated POST body, headers, and fetch response shape', async () => {
    vi.mocked(API.post).mockResolvedValue({
        headers: {},
        status: 200,
        statusText: 'OK',
        request: { url: '/graphql' },
        data: { data: { status: 'CLEAN' } },
    })
    const response = await fakeAmplifyFetch('/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: 'query Status { status }' }),
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'x-test': 'keep',
        },
    })
    expect(API.post).toHaveBeenCalledWith('api', '/graphql', {
        response: true,
        body: { query: 'query Status { status }' },
        headers: { 'x-test': 'keep' },
    })
    expect(await response.text()).toBe(
        JSON.stringify({ data: { status: 'CLEAN' } })
    )
    expect(API.cancel).not.toHaveBeenCalled()
})

it('cancels the original Amplify request when its fetch signal is aborted', async () => {
    const request = new Promise(() => {})
    vi.mocked(API.post).mockReturnValue(request)
    const controller = new AbortController()
    const response = fakeAmplifyFetch('/graphql', {
        method: 'POST',
        signal: controller.signal,
    })
    controller.abort()
    await expect(response).rejects.toMatchObject({ name: 'AbortError' })
    expect(API.cancel).toHaveBeenCalledWith(request, 'Request aborted')
    vi.mocked(API.post).mockClear()
    await expect(
        fakeAmplifyFetch('/graphql', {
            method: 'POST',
            signal: controller.signal,
        })
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(API.post).not.toHaveBeenCalled()
})
