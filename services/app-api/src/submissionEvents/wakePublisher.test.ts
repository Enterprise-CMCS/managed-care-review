const send = vi.hoisted(() => vi.fn())
vi.mock('@aws-sdk/client-lambda', () => ({
    LambdaClient: class {
        send = send
    },
    InvokeCommand: class {
        constructor(public input: unknown) {}
    },
}))
import { wakeSubmissionEventPublisher } from './wakePublisher'

describe('publisher wakeup', () => {
    beforeEach(() => {
        vi.stubEnv('stage', 'poc-events')
        vi.stubEnv('SUBMISSION_EVENTS_POC_ENABLED', 'true')
        vi.stubEnv('SUBMISSION_EVENTS_PUBLISHER_FUNCTION_NAME', 'poc-publisher')
        send.mockReset()
    })
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
    })
    it('requests an asynchronous invocation', async () => {
        await wakeSubmissionEventPublisher()
        expect(send.mock.calls[0][0].input).toMatchObject({
            FunctionName: 'poc-publisher',
            InvocationType: 'Event',
        })
    })
    it('never fails the submission when wakeup fails', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        send.mockRejectedValue(new Error('AWS unavailable'))
        await expect(wakeSubmissionEventPublisher()).resolves.toBeUndefined()
    })
    it('does nothing when disabled or in an official stage', async () => {
        vi.stubEnv('stage', 'prod')
        await wakeSubmissionEventPublisher()
        vi.stubEnv('stage', 'poc-events')
        vi.stubEnv('SUBMISSION_EVENTS_POC_ENABLED', 'false')
        await wakeSubmissionEventPublisher()
        expect(send).not.toHaveBeenCalled()
    })
})
