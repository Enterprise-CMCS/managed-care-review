import { screen, waitFor, within } from '@testing-library/react'
import {
    mockContractAndRatesDraft,
    mockStateSubmission,
    mockMNState,
} from '../../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { RateDetailsSummarySection } from './RateDetailsSummarySection'
import { RateInfoType } from '../../../common-code/healthPlanFormDataType'

describe('RateDetailsSummarySection', () => {
    const draftSubmission = mockContractAndRatesDraft()
    const stateSubmission = mockStateSubmission()
    const statePrograms = mockMNState().programs
    const mockRateInfos: RateInfoType[] = [
        {
            rateType: 'NEW',
            rateCapitationType: 'RATE_CELL',
            rateDocuments: [
                {
                    s3URL: 's3://foo/bar/rate',
                    name: 'rate docs test 1',
                    documentCategories: ['RATES' as const],
                },
            ],
            rateDateStart: new Date('01/01/2021'),
            rateDateEnd: new Date('12/31/2021'),
            rateDateCertified: new Date('12/31/2020'),
            rateAmendmentInfo: {
                effectiveDateStart: new Date('01/01/2021'),
                effectiveDateEnd: new Date('12/31/2021'),
            },
            rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        },
        {
            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_RANGE',
            rateDocuments: [
                {
                    s3URL: 's3://foo/bar/rate2',
                    name: 'rate docs test 2',
                    documentCategories: ['RATES' as const],
                },
            ],
            rateDateStart: new Date('01/01/2022'),
            rateDateEnd: new Date('12/31/2022'),
            rateDateCertified: new Date('12/31/2021'),
            rateAmendmentInfo: {
                effectiveDateStart: new Date('01/01/2022'),
                effectiveDateEnd: new Date('12/31/2022'),
            },
            rateProgramIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
        },
    ]

    afterEach(() => jest.clearAllMocks())

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
        submission.rateInfos[0].rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'

        const statePrograms = mockMNState().programs
        renderWithProviders(
            <RateDetailsSummarySection
                submission={submission}
                navigateTo="rate-details"
                submissionName="MN-MSHO-0003"
                statePrograms={statePrograms}
            />
        )
        const rateName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'
        expect(screen.getByText(rateName)).toBeInTheDocument()
    })

    it('can render correct rate name for AMENDMENT rate submission', () => {
        const submission = {
            ...mockContractAndRatesDraft(),
            rateDateStart: new Date('2022-01-25'),
            rateDateEnd: new Date('2023-01-25'),
            rateDateCertified: new Date('2022-01-26'),
            rateAmendmentInfo: {
                effectiveDateStart: new Date('2022-02-25'),
                effectiveDateEnd: new Date('2023-02-26'),
            },
        }

        submission.rateInfos[0].rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'

        const statePrograms = mockMNState().programs

        renderWithProviders(
            <RateDetailsSummarySection
                submission={submission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )

        const rateName =
            'MCR-MN-0005-SNBC-RATE-20221013-20221013-CERTIFICATION-20221013'

        expect(screen.getByText(rateName)).toBeInTheDocument()
    })

    it('can render all rate details fields for new rate certification submission', () => {
        const statePrograms = mockMNState().programs
        stateSubmission.rateInfos[0].rateCertificationName =
            'MCR-MN-0005-SNBC-RATE-20221014-20221014-CERTIFICATION-20221014'
        renderWithProviders(
            <RateDetailsSummarySection
                submission={stateSubmission}
                submissionName="MN-MSHO-0003"
                statePrograms={statePrograms}
            />
        )

        const rateName =
            'MCR-MN-0005-SNBC-RATE-20221014-20221014-CERTIFICATION-20221014'

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

    it('renders supporting rates docs when they exist', async () => {
        const testSubmission = {
            ...draftSubmission,
            rateInfos: [
                {
                    rateDocuments: [
                        {
                            s3URL: 's3://foo/bar/rate',
                            name: 'rate docs test 1',
                            documentCategories: ['RATES' as const],
                        },
                    ],
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
                name: /Rate certification/,
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
        draftSubmission.rateInfos[0].rateCapitationType = 'RATE_RANGE'
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

    it('renders programs that apply to rate certification', async () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos[0].rateProgramIDs = [
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

    it('renders rate program names even when rate program ids are missing', async () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateProgramIDs = []
        draftSubmission.rateInfos[0].rateProgramIDs = []
        draftSubmission.programIDs = [
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

    it('renders multiple rate certifications with program names', async () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateProgramIDs = []
        draftSubmission.rateInfos = mockRateInfos
        renderWithProviders(
            <RateDetailsSummarySection
                submission={draftSubmission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )
        const programList = screen.getAllByRole('definition', {
            name: 'Programs this rate certification covers',
        })
        expect(programList).toHaveLength(2)
        expect(programList[0]).toHaveTextContent('SNBC')
        expect(programList[1]).toHaveTextContent('PMAP')
    })
    it('renders multiple rate certifications with rate type', async () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos = mockRateInfos

        renderWithProviders(
            <RateDetailsSummarySection
                submission={draftSubmission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )
        const certType = screen.getAllByRole('definition', {
            name: 'Rate certification type',
        })
        expect(certType).toHaveLength(2)
        expect(certType[0]).toHaveTextContent('New')
        expect(certType[1]).toHaveTextContent('Amendment')
    })

    it('renders multiple rate certifications with documents', async () => {
        const draftSubmission = mockContractAndRatesDraft()
        draftSubmission.rateInfos = mockRateInfos
        renderWithProviders(
            <RateDetailsSummarySection
                submission={draftSubmission}
                navigateTo="rate-details"
                submissionName="MN-PMAP-0001"
                statePrograms={statePrograms}
            />
        )
        await waitFor(() => {
            const rateDocsTables = screen.getAllByRole('table', {
                name: /Rate certification/,
            })
            expect(rateDocsTables).toHaveLength(2)
            expect(
                within(rateDocsTables[0]).getByRole('row', {
                    name: /rate docs test 1/,
                })
            ).toBeInTheDocument()
            expect(
                within(rateDocsTables[1]).getByRole('row', {
                    name: /rate docs test 2/,
                })
            ).toBeInTheDocument()
        })
    })
})
