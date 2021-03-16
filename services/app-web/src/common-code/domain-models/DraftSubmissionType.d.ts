// DraftSubmission is a draft submission.

export type SubmissionRatesType = 'CONTRACTS_ONLY' | 'CONTRACTS_AND_RATES'

export type DraftSubmissionType = {
	id: string
	stateCode: string
	stateNumber: number
	programID: string
	description: string
	ratesType: SubmissionRatesType
	createdAt: Date
}
