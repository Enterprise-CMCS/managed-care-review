import { main } from './log_event'
import { APIGatewayProxyEvent, Context } from 'aws-lambda'

describe('log_event', () => {
	it('returns 200', () => {

		const mockEvent: APIGatewayProxyEvent = {
			body: '{"test": "testing"}',
		} as any

		const mockContext: Context = {} as any

		const lambdaPromise = main(mockEvent, mockContext, () => {})

		if (lambdaPromise == null) {
			fail()
		} else {
			lambdaPromise.then( (result) => {
				expect(result.statusCode).toBe(200)
			})
		}
	})
})