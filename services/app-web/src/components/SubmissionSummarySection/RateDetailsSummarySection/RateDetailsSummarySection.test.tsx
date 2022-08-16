import { screen, waitFor, within } from '@testing-library/react'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
    mockMNState,
} from '../../../testHelpers/apolloHelpers'
import { HealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { RateDetailsSummarySection } from './RateDetailsSummarySection'
import { generateRateName } from '../../../common-code/healthPlanFormDataType';

describe('RateDetailsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()
    const statePrograms = mockMNState().programs

    it('can render draft submission without errors', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                submission={draftSubmission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Rate details',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit Rate details' })
        ).toHaveAttribute('href', '/rate-details')
    })

    it('can render state submission without errors', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                submission={stateSubmission}
                submissionName="MN-MSHO-0003"
                statePrograms={statePrograms}
            />
        )

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Rate details',
            })
        ).toBeInTheDocument()
        // Is this the best way to check that the link is not present?
        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })

    it('can render all rate details fields for amendment to prior rate certification submission', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                submission={draftSubmission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )
        expect(
            screen.getByRole('definition', { name: 'Rate certification type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Rating period of original rate certification',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Date certified for rate amendment',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', {
                name: 'Rate amendment effective dates',
            })
        ).toBeInTheDocument()
    })

    it('can render correct rate name for new rate submission', () => {
        const submission = mockStateSubmission()
        submission.rateProgramIDs = undefined

        const statePrograms = mockMNState().programs
        renderWithProviders(
            <RateDetailsSummarySection
                submission={submission}
                navigateTo="rate-details"
                submissionName="MN-MSHO-0003"
                statePrograms={statePrograms}
            />
        )
        const rateName = generateRateName(submission, statePrograms)
        expect(screen.getByText(rateName)).toBeInTheDocument()
    })

    it('can render correct rate name for AMENDMENT rate submission', () => {
        const submission: HealthPlanFormDataType = {
            ...mockContractAndRatesDraft(),
            rateDateStart: '2022-01-25',
            rateDateEnd: '2023-01-25',
            rateDateCertified: '2022-01-26',
            rateAmendmentInfo: {
                effectiveDateStart: '2022-02-25',
                effectiveDateEnd: '2023-02-26',
            },
        }

        const statePrograms = mockMNState().programs

        renderWithProviders(
            <RateDetailsSummarySection
                submission={submission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )

        const rateName = generateRateName(submission, statePrograms)

        expect(screen.getByText(rateName)).toBeInTheDocument()
    })

    it('can render all rate details fields for new rate certification submission', () => {
        const statePrograms = mockMNState().programs
        renderWithProviders(
            <RateDetailsSummarySection
                submission={stateSubmission}
                submissionName="MN-MSHO-0003"
                statePrograms={statePrograms}
            />
        )

        const rateName = generateRateName(stateSubmission, statePrograms)

        expect(screen.getByText(rateName)).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Rate certification type' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Rating period' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('definition', { name: 'Date certified' })
        ).toBeInTheDocument()
    })

    it('render supporting rates docs when they exist', async () => {
        const testSubmission = {
            ...draftSubmission,
            rateDocuments: [
                {
                    s3URL: 's3://foo/bar/rate',
                    name: 'rate docs test 1',
                    documentCategories: ['RATES' as const],
                },
            ],
            documents: [
                {
                    s3URL: 's3://foo/bar/test-1',
                    name: 'supporting docs test 1',
                    documentCategories: ['CONTRACT_RELATED' as const],
                },
                {
                    s3URL: 's3://foo/bar/test-2',
                    name: 'supporting docs test 2',
                    documentCategories: ['RATES_RELATED' as const],
                },
                {
                    s3URL: 's3://foo/bar/test-3',
                    name: 'supporting docs test 3',
                    documentCategories: [
                        'CONTRACT_RELATED' as const,
                        'RATES_RELATED' as const,
                    ],
                },
            ],
        }
        renderWithProviders(
            <RateDetailsSummarySection
                submission={testSubmission}
                navigateTo="/rate-details'"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )

        await waitFor(() => {
            const supportingDocsTable = screen.getByRole('table', {
                name: /Rate supporting documents/,
            })
            const rateDocsTable = screen.getByRole('table', {
                name: 'Rate certification',
            })

            expect(rateDocsTable).toBeInTheDocument()
            expect(supportingDocsTable).toBeInTheDocument()
            expect(
                screen.getByRole('link', {
                    name: /Edit Rate supporting documents/,
                })
            ).toHaveAttribute('href', '/documents')

            const supportingDocsTableRows =
                within(supportingDocsTable).getAllByRole('rowgroup')
            expect(supportingDocsTableRows).toHaveLength(2)

            // check row content
            expect(
                within(rateDocsTable).getByRole('row', {
                    name: /rate docs test 1/,
                })
            ).toBeInTheDocument()
            expect(
                within(supportingDocsTable).getByText('supporting docs test 2')
            ).toBeInTheDocument()
            expect(
                within(supportingDocsTable).getByText('*supporting docs test 3')
            ).toBeInTheDocument()

            // check correct category on supporting docs
            expect(
                within(supportingDocsTable).getAllByText('Rate-supporting')
            ).toHaveLength(2)
        })
    })

    it('does not render supporting rate documents when they do not exist', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                submission={draftSubmission}
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )

        expect(
            screen.queryByRole('table', {
                name: /Rate supporting documents/,
            })
        ).toBeNull()
    })

    it('does not render download all button when on previous submission', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                submission={stateSubmission}
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )
        expect(
            screen.queryByRole('button', {
                name: 'Download all rate documents',
            })
        ).toBeNull()
    })
    it('renders rate cell capitation type', () => {
        renderWithProviders(
            <RateDetailsSummarySection
                submission={draftSubmission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )
        expect(
            screen.getByRole('definition', {
                name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Certification of capitation rates specific to each rate cell'
            )
        ).toBeInTheDocument()
    })
    it('renders rate range capitation type', () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateCapitationType = 'RATE_RANGE'
        renderWithProviders(
            <RateDetailsSummarySection
                submission={draftSubmission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )
        expect(
            screen.getByRole('definition', {
                name: 'Does the actuary certify capitation rates specific to each rate cell or a rate range?',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Certification of rate ranges of capitation rates per rate cell'
            )
        ).toBeInTheDocument()
    })
    // TODO: Enable test after rate certification program feature is fully implemented
    it.skip('renders programs that apply to rate certification', async () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateProgramIDs = [
            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
            'd95394e5-44d1-45df-8151-1cc1ee66f100',
        ]
        draftSubmission.rateCapitationType = 'RATE_RANGE'
        renderWithProviders(
            <RateDetailsSummarySection
                submission={draftSubmission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )
        const programElement = screen.getByRole('definition', {
            name: 'Programs this rate certification covers',
        })
        expect(programElement).toBeInTheDocument()

        const programList = within(programElement).getByText('SNBC, PMAP')
        expect(programList).toBeInTheDocument()
    })
})
