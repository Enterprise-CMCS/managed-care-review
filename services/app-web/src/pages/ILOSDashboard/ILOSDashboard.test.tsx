import { screen, within } from '@testing-library/react'
import { GraphQLError } from 'graphql'
import {
    fetchCurrentUserMock,
    indexIlosSubmissionsStrippedMockSuccess,
    mockILOSContractStripped,
    mockValidCMSUser,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { IndexIlosSubmissionsStrippedDocument } from '../../gen/gqlClient'
import { ILOSDashboard } from './ILOSDashboard'

const draftILOS = () =>
    mockILOSContractStripped({
        id: 'test-ilos-draft',
        status: 'DRAFT',
        consolidatedStatus: 'DRAFT',
        initiallySubmittedAt: null,
        latestSubmittedRevision: null,
        draftRevision: {
            __typename: 'ContractRevisionStripped',
            id: 'test-ilos-draft-revision',
            contractID: 'test-ilos-draft',
            createdAt: new Date('2026-09-01'),
            updatedAt: new Date('2026-09-01'),
            contractName: 'MCR-ILOS-MN-0006',
            submitInfo: null,
            unlockInfo: null,
            formData: {
                __typename: 'ContractFormDataStripped',
                programIDs: [],
                populationCovered: null,
                submissionType: 'CONTRACT_AND_RATES',
                contractType: 'BASE',
                managedCareEntities: [],
                ilosRateDateStart: new Date('2025-01-01'),
                ilosRateDateEnd: new Date('2025-12-31'),
            },
        },
    })

describe('ILOSDashboard', () => {
    it('displays the ILOS heading', async () => {
        renderWithProviders(<ILOSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexIlosSubmissionsStrippedMockSuccess([]),
                ],
            },
        })

        expect(
            await screen.findByRole('heading', {
                level: 2,
                name: 'ILOS actuarial reports',
            })
        ).toBeInTheDocument()
        expect(screen.getByTestId('ilos-table-empty')).toBeInTheDocument()
    })

    it('displays draft and submitted ILOS submissions for a state user', async () => {
        renderWithProviders(<ILOSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexIlosSubmissionsStrippedMockSuccess([
                        draftILOS(),
                        mockILOSContractStripped({ id: 'test-ilos-submitted' }),
                    ]),
                ],
            },
        })

        const draftRow = within(
            await screen.findByTestId('row-test-ilos-draft')
        )
        expect(
            draftRow.getByRole('link', { name: 'MCR-ILOS-MN-0006' })
        ).toHaveAttribute('href', '/submissions/ilos/test-ilos-draft/edit/type')
        expect(
            draftRow.getByTestId('ilos-submission-rate-date-start')
        ).toHaveTextContent('01/01/2025')
        expect(
            draftRow.getByTestId('ilos-submission-rate-date-end')
        ).toHaveTextContent('12/31/2025')
        expect(
            draftRow.getByTestId('ilos-submission-date')
        ).toBeEmptyDOMElement()
        expect(
            draftRow.getByTestId('ilos-submission-status')
        ).toHaveTextContent('Draft')

        const submittedRow = within(
            screen.getByTestId('row-test-ilos-submitted')
        )
        expect(
            submittedRow.getByRole('link', { name: 'MCR-ILOS-MN-0005' })
        ).toHaveAttribute('href', '/submissions/ilos/test-ilos-submitted')
        expect(
            submittedRow.getByTestId('ilos-submission-rate-date-start')
        ).toHaveTextContent('07/01/2023')
        expect(
            submittedRow.getByTestId('ilos-submission-rate-date-end')
        ).toHaveTextContent('06/30/2024')
        expect(
            submittedRow.getByTestId('ilos-submission-date')
        ).toHaveTextContent('01/14/2024')
        expect(
            submittedRow.getByTestId('ilos-submission-status')
        ).toHaveTextContent('Submitted')
        expect(
            screen.queryByRole('columnheader', { name: 'State' })
        ).not.toBeInTheDocument()
    })

    it('displays the state column and the submitted revision for a CMS user', async () => {
        renderWithProviders(<ILOSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
                        user: mockValidCMSUser(),
                    }),
                    indexIlosSubmissionsStrippedMockSuccess([
                        mockILOSContractStripped({ id: 'test-ilos-submitted' }),
                    ]),
                ],
            },
        })

        const submittedRow = within(
            await screen.findByTestId('row-test-ilos-submitted')
        )
        expect(
            screen.getByRole('columnheader', { name: 'State' })
        ).toBeInTheDocument()
        expect(
            submittedRow.getByTestId('ilos-submission-stateName')
        ).toHaveTextContent('Minnesota')
        expect(
            submittedRow.getByRole('link', { name: 'MCR-ILOS-MN-0005' })
        ).toHaveAttribute('href', '/submissions/ilos/test-ilos-submitted')
    })

    const failedIlosQueryMock = () => ({
        request: {
            query: IndexIlosSubmissionsStrippedDocument,
        },
        result: {
            errors: [new GraphQLError('ILOS index failed')],
        },
    })

    it('displays an error banner without a page heading when the query fails for a state user', async () => {
        renderWithProviders(<ILOSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    failedIlosQueryMock(),
                ],
            },
        })

        expect(
            await screen.findByRole('heading', { name: /System error/ })
        ).toBeInTheDocument()
        expect(screen.queryByTestId('ilos-dashboard')).not.toBeInTheDocument()
        expect(
            screen.queryByRole('heading', { level: 1 })
        ).not.toBeInTheDocument()
    })

    it('displays the error page when the query fails for a CMS user', async () => {
        renderWithProviders(<ILOSDashboard />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
                        user: mockValidCMSUser(),
                    }),
                    failedIlosQueryMock(),
                ],
            },
        })

        expect(await screen.findByTestId('ilos-dashboard')).toBeInTheDocument()
    })
})
