import { DraftSubmission, DraftSubmissionUpdates } from '../../gen/gqlClient'
import {
    cleanDraftSubmission,
    stripTypename,
} from './updateSubmissionTransform'

describe('submission transform functions', () => {
    describe('cleanDraftSubmission', () => {
        it('empties rate related fields if submission is contract only', () => {
            const submissionWithRates: DraftSubmissionUpdates = {
                programID: 'snbc',
                submissionType: 'CONTRACT_ONLY',
                submissionDescription: 'A real submission',
                documents: [],
                contractDocuments: [],
                managedCareEntities: [],
                federalAuthorities: [],
                rateType: 'NEW',
                rateDocuments: [],
                rateDateStart: new Date(2021, 4, 22),
                rateDateEnd: new Date(2021, 4, 25),
                rateDateCertified: new Date(2021, 4, 22),
                rateAmendmentInfo: undefined,
                stateContacts: [
                    {
                        name: 'West',
                        titleRole: 'navigation',
                        email: 'west@theinternet.com',
                    },
                ],
                actuaryContacts: [
                    {
                        name: 'EastActuary',
                        titleRole: 'navigation',
                        email: 'east@theinternet.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_STATE',
            }
            const submissionWithoutRates = {
                programID: 'snbc',
                submissionType: 'CONTRACT_ONLY',
                submissionDescription: 'A real submission',
                documents: [],
                contractDocuments: [],
                managedCareEntities: [],
                federalAuthorities: [],
                rateDocuments: [],
                stateContacts: [
                    {
                        name: 'West',
                        titleRole: 'navigation',
                        email: 'west@theinternet.com',
                    },
                ],
                actuaryContacts: [],
            }
            expect(cleanDraftSubmission(submissionWithRates)).toEqual(
                submissionWithoutRates
            )
        })

        it('does not empty rate fields if submission is CONTRACT_AND_RATES', () => {
            const submissionWithRates: DraftSubmissionUpdates = {
                programID: 'snbc',
                submissionType: 'CONTRACT_ONLY',
                submissionDescription: 'A real submission',
                documents: [],
                contractDocuments: [],
                managedCareEntities: [],
                federalAuthorities: [],
                rateType: 'NEW',
                rateDocuments: [],
                rateDateStart: new Date(2021, 4, 22),
                rateDateEnd: new Date(2021, 4, 25),
                rateDateCertified: new Date(2021, 4, 22),
                rateAmendmentInfo: undefined,
                stateContacts: [
                    {
                        name: 'West',
                        titleRole: 'navigation',
                        email: 'west@theinternet.com',
                    },
                ],
                actuaryContacts: [
                    {
                        name: 'EastActuary',
                        titleRole: 'navigation',
                        email: 'east@theinternet.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_STATE',
            }

            expect(cleanDraftSubmission(submissionWithRates)).toEqual(
                submissionWithRates
            )
        })
    })

    describe('stripTypename', () => {
        it('clears out gql generated typename as expected', () => {
            expect(
                stripTypename([
                    {
                        __typename: 'Document',
                        s3URL: 'test',
                        name: 'test test name',
                    },
                ] as DraftSubmission['documents'])
            ).toEqual([
                {
                    s3URL: 'test',
                    name: 'test test name',
                },
            ])
        })
    })
})
