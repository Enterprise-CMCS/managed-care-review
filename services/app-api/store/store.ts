import DynamoDB from 'aws-sdk/clients/dynamodb'
import { insertDraftSubmission } from './createDraftSubmission'

export function newLocalStoreConnection(dyanmoURL: string) {
	const config = {
		region: 'localhost',
		endpoint: dyanmoURL,
		accessKeyId: 'LOCAL_FAKE_KEY',
		secretAccessKey: 'LOCAL_FAKE_SECRET',
	}

	return new DynamoDB(config)
}
