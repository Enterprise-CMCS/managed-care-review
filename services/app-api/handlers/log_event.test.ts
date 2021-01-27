import { main } from './log_event'
import { APIGatewayProxyEvent, Context } from 'aws-lambda'

describe('log_event', () => {
	it('returns 200', () => {

		const mockEvent: APIGatewayProxyEvent = {
			body: '{"test": "testing"}',
		} as any // eslint-disable-line @typescript-eslint/no-explicit-any

		const mockContext: Context = {} as any // eslint-disable-line @typescript-eslint/no-explicit-any

		const lambdaPromise = main(mockEvent, mockContext, () => {}) // eslint-disable-line @typescript-eslint/no-empty-function

		if (lambdaPromise == null) {
			fail()
		} else {
			lambdaPromise.then( (result) => {
				expect(result.statusCode).toBe(200)
			})
		}
	})
})