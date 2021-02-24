import { main } from './log_event'
import { APIGatewayProxyEvent, Context } from 'aws-lambda'

describe('log_event', () => {
    it('returns 200', async () => {
        const mockEvent: APIGatewayProxyEvent = {
            body: '{"test": "testing"}',
        } as any // eslint-disable-line @typescript-eslint/no-explicit-any

        const mockContext: Context = {} as any // eslint-disable-line @typescript-eslint/no-explicit-any

        try {
            const lambda = await main(mockEvent, mockContext, () => {}) // eslint-disable-line @typescript-eslint/no-empty-function

            if (lambda == null) {
                fail()
            }
            expect(lambda.statusCode).toBe(200)
        } catch (e) {
            fail(e)
        }
    })
})
